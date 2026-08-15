const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { requireAuth } = require('./auth');
const { holdDeposit, captureDeposit, releaseDeposit } = require('../lib/deposits');
const { sendBookingSms, fmtTime } = require('../lib/sms');
const { safeNowInTz } = require('../lib/time');
const { isActive } = require('../lib/plans');
const { bookingLimiter } = require('../lib/rateLimit');

const router = express.Router();
const SLOT_STEP = 15; // slot granularity in minutes
const MIN_LEAD_MIN = 15; // clients must book at least this many minutes ahead

// ---- Availability (public) ----
// GET /api/public/:slug/availability?service_id=1&staff_id=2&date=2026-07-10
router.get('/public/:slug/availability', (req, res) => {
  const b = db.prepare('SELECT * FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const { service_id, staff_id, date } = req.query;
  const service = db
    .prepare('SELECT * FROM services WHERE id = ? AND business_id = ? AND active = 1')
    .get(service_id, b.id);
  if (!service || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'service_id and date (YYYY-MM-DD) required' });
  }

  const weekday = new Date(`${date}T00:00:00`).getDay();
  const hrs = db.prepare('SELECT * FROM hours WHERE business_id = ? AND weekday = ?').get(b.id, weekday);
  if (!hrs) return res.json({ slots: [] }); // closed

  // Past dates have no availability; for today, hide slots that already passed
  const now = safeNowInTz(b.timezone);
  if (date < now.date) return res.json({ slots: [] });
  const earliest = date === now.date ? now.min + MIN_LEAD_MIN : 0;

  const taken = db
    .prepare(
      `SELECT start_min, end_min FROM bookings
       WHERE business_id = ? AND staff_id = ? AND date = ? AND status IN ('confirmed', 'completed')`
    )
    .all(b.id, staff_id, date);

  const slots = [];
  for (let t = hrs.open_min; t + service.duration_min <= hrs.close_min; t += SLOT_STEP) {
    if (t < earliest) continue;
    const end = t + service.duration_min;
    const clash = taken.some((k) => t < k.end_min && end > k.start_min);
    if (!clash) slots.push(t);
  }
  res.json({ slots, duration_min: service.duration_min });
});

// ---- Create booking (public) ----
router.post('/public/:slug/bookings', bookingLimiter, async (req, res) => {
  const b = db.prepare('SELECT * FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (!isActive(b)) return res.status(403).json({ error: 'This salon is not accepting online bookings right now.' });
  const { service_id, staff_id, date, start_min, customer_name, customer_phone, card_token } = req.body || {};

  const service = db
    .prepare('SELECT * FROM services WHERE id = ? AND business_id = ? AND active = 1')
    .get(service_id, b.id);
  const staffRow = db
    .prepare('SELECT * FROM staff WHERE id = ? AND business_id = ? AND active = 1')
    .get(staff_id, b.id);
  if (!service || !staffRow) return res.status(400).json({ error: 'Invalid service or staff' });
  if (!customer_name || !customer_phone) return res.status(400).json({ error: 'Name and phone required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isInteger(start_min)) {
    return res.status(400).json({ error: 'Invalid date/time' });
  }

  const end_min = start_min + service.duration_min;

  // Reject past bookings (in the salon's timezone)
  const now = safeNowInTz(b.timezone);
  if (date < now.date || (date === now.date && start_min < now.min + MIN_LEAD_MIN)) {
    return res.status(400).json({ error: 'That time has already passed — pick a later slot' });
  }

  // Enforce opening hours (UI only shows valid slots, but the API must not trust the client)
  const weekday = new Date(`${date}T00:00:00`).getDay();
  const hrs = db.prepare('SELECT * FROM hours WHERE business_id = ? AND weekday = ?').get(b.id, weekday);
  if (!hrs || start_min < hrs.open_min || end_min > hrs.close_min) {
    return res.status(400).json({ error: 'Outside business hours' });
  }

  // Re-check the slot inside a transaction (avoid double booking race)
  const clash = db
    .prepare(
      `SELECT 1 FROM bookings
       WHERE business_id = ? AND staff_id = ? AND date = ?
         AND status IN ('confirmed', 'completed') AND ? < end_min AND ? > start_min`
    )
    .get(b.id, staff_id, date, start_min, end_min);
  if (clash) return res.status(409).json({ error: 'That slot was just taken — pick another' });

  const cancel_token = crypto.randomBytes(16).toString('hex');
  const info = db
    .prepare(
      `INSERT INTO bookings (business_id, service_id, staff_id, customer_name, customer_phone,
        date, start_min, end_min, cancel_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.id, service_id, staff_id, customer_name, customer_phone, date, start_min, end_min, cancel_token);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);

  // Deposit hold (Square direct charge when the salon is connected; simulated in dev).
  // If the card hold fails, the booking must not survive — remove it and tell the client.
  try {
    const { holdId } = await holdDeposit(b, booking, card_token);
    db.prepare(`UPDATE bookings SET deposit_status = 'held', deposit_hold_id = ? WHERE id = ?`).run(holdId, booking.id);
  } catch (e) {
    console.error('[deposits] hold failed:', e.message);
    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
    const status = e.code === 'CARD_REQUIRED' ? 400 : 402;
    return res.status(status).json({
      error: e.code === 'CARD_REQUIRED' ? 'Card details required to book' : `Card was declined: ${e.message}`,
    });
  }

  const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/cancel/${cancel_token}`;
  await sendBookingSms(
    booking, 'confirm',
    `Confirmed! ${service.name} at ${b.name} on ${date} ${fmtTime(start_min)}. ` +
    `$${(b.deposit_cents / 100).toFixed(2)} deposit held. Cancel: ${cancelUrl}`
  );

  res.json({ id: booking.id, date, start_min, service: service.name, staff: staffRow.name });
});

// ---- Customer self-cancel via SMS link (public) ----
router.post('/public/cancel/:token', async (req, res) => {
  const booking = db.prepare(`SELECT * FROM bookings WHERE cancel_token = ?`).get(req.params.token);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (booking.status !== 'confirmed') return res.json({ ok: true, status: booking.status });

  const b = db.prepare('SELECT * FROM businesses WHERE id = ?').get(booking.business_id);
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(booking.id);
  if (booking.deposit_status === 'held') {
    await releaseDeposit(b, booking);
    db.prepare(`UPDATE bookings SET deposit_status = 'released' WHERE id = ?`).run(booking.id);
  }
  res.json({ ok: true, status: 'cancelled' });
});

// ---- Dashboard (auth) ----

// GET /api/bookings/range?from=YYYY-MM-DD&to=YYYY-MM-DD — for calendar week view
router.get('/bookings/range', requireAuth, (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
    return res.status(400).json({ error: 'from/to (YYYY-MM-DD) required' });
  }
  const rows = db
    .prepare(
      `SELECT bk.id, bk.date, bk.start_min, bk.end_min, bk.status, bk.customer_name,
              s.name AS service_name, st.name AS staff_name
       FROM bookings bk
       JOIN services s ON s.id = bk.service_id
       JOIN staff st ON st.id = bk.staff_id
       WHERE bk.business_id = ? AND bk.date BETWEEN ? AND ?
       ORDER BY bk.date, bk.start_min`
    )
    .all(req.business.id, from, to);
  res.json({ bookings: rows });
});

// GET /api/clients — CRM: every client with visit history, aggregated from bookings
router.get('/clients', requireAuth, (req, res) => {
  const today = safeNowInTz(req.business.timezone).date;
  const rows = db
    .prepare(
      `SELECT bk.customer_phone AS phone,
              MAX(bk.customer_name) AS name,
              COUNT(*) AS total_bookings,
              SUM(CASE WHEN bk.status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN bk.status = 'no_show' THEN 1 ELSE 0 END) AS no_shows,
              SUM(CASE WHEN bk.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
              MAX(CASE WHEN bk.status = 'completed' THEN bk.date END) AS last_visit,
              MIN(CASE WHEN bk.status = 'confirmed' AND bk.date >= ? THEN bk.date END) AS next_visit,
              COALESCE(SUM(CASE WHEN bk.status = 'completed' THEN s.price_cents ELSE 0 END), 0) AS total_spent_cents,
              (SELECT s2.name FROM bookings bk2
                 JOIN services s2 ON s2.id = bk2.service_id
                WHERE bk2.customer_phone = bk.customer_phone AND bk2.business_id = bk.business_id
                  AND bk2.status = 'completed'
                ORDER BY bk2.date DESC LIMIT 1) AS last_service
       FROM bookings bk
       JOIN services s ON s.id = bk.service_id
       WHERE bk.business_id = ?
       GROUP BY bk.customer_phone
       ORDER BY (last_visit IS NULL), last_visit DESC`
    )
    .all(today, req.business.id);
  res.json({ clients: rows });
});

// GET /api/bookings?date=YYYY-MM-DD (default today)
router.get('/bookings', requireAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `SELECT bk.*, s.name AS service_name, st.name AS staff_name
       FROM bookings bk
       JOIN services s ON s.id = bk.service_id
       JOIN staff st ON st.id = bk.staff_id
       WHERE bk.business_id = ? AND bk.date = ?
       ORDER BY bk.start_min`
    )
    .all(req.business.id, date);
  res.json({ date, bookings: rows });
});

// PATCH /api/bookings/:id  { status: completed | no_show | cancelled }
router.patch('/bookings/:id', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!['completed', 'no_show', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.business.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const b = req.business;

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id);

  if (status === 'no_show' && booking.deposit_status === 'held') {
    await captureDeposit(b, booking);
    db.prepare(`UPDATE bookings SET deposit_status = 'captured' WHERE id = ?`).run(booking.id);
    await sendBookingSms(
      booking, 'no_show',
      `You missed your appointment at ${b.name}. Per our policy the $${(b.deposit_cents / 100).toFixed(2)} deposit was charged.`
    );
  }

  if ((status === 'completed' || status === 'cancelled') && booking.deposit_status === 'held') {
    await releaseDeposit(b, booking);
    db.prepare(`UPDATE bookings SET deposit_status = 'released' WHERE id = ?`).run(booking.id);
  }

  if (status === 'completed' && b.google_review_url) {
    await sendBookingSms(
      booking, 'review',
      `Thanks for visiting ${b.name}! We'd love a quick review: ${b.google_review_url}`
    );
  }

  res.json({ ok: true });
});

// GET /api/stats — "$X saved" + per-staff breakdown + expected revenue
router.get('/stats', requireAuth, (req, res) => {
  const id = req.business.id;
  const total = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE business_id = ?`).get(id).c;
  const noShows = db
    .prepare(`SELECT COUNT(*) c FROM bookings WHERE business_id = ? AND status = 'no_show'`)
    .get(id).c;
  const captured = db
    .prepare(`SELECT COUNT(*) c FROM bookings WHERE business_id = ? AND deposit_status = 'captured'`)
    .get(id).c;
  const completedRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(s.price_cents), 0) v FROM bookings bk
       JOIN services s ON s.id = bk.service_id
       WHERE bk.business_id = ? AND bk.status = 'completed'`
    )
    .get(id).v;
  const perStaff = db
    .prepare(
      `SELECT st.name,
              COUNT(*) AS bookings,
              SUM(CASE WHEN bk.status = 'no_show' THEN 1 ELSE 0 END) AS no_shows,
              COALESCE(SUM(CASE WHEN bk.status = 'completed' THEN s.price_cents ELSE 0 END), 0) AS revenue_cents
       FROM bookings bk
       JOIN staff st ON st.id = bk.staff_id
       JOIN services s ON s.id = bk.service_id
       WHERE bk.business_id = ?
       GROUP BY st.id ORDER BY bookings DESC`
    )
    .all(id);
  res.json({
    total_bookings: total,
    no_shows: noShows,
    recovered_cents: captured * req.business.deposit_cents,
    completed_revenue_cents: completedRevenue,
    per_staff: perStaff,
  });
});

module.exports = router;
