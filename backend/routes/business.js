const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('./auth');
const square = require('../lib/square');
const { isActive, staffLimit } = require('../lib/plans');

const router = express.Router();

// ---- Dashboard settings (auth) ----

router.get('/me', requireAuth, (req, res) => {
  const b = req.business;
  res.json({
    id: b.id, name: b.name, slug: b.slug, email: b.email, phone: b.phone,
    timezone: b.timezone, deposit_cents: b.deposit_cents,
    google_review_url: b.google_review_url, plan: b.plan,
    address: b.address, about: b.about,
    square_connected: !!b.square_connected,
    services: db.prepare('SELECT * FROM services WHERE business_id = ? AND active = 1').all(b.id),
    staff: db.prepare('SELECT * FROM staff WHERE business_id = ? AND active = 1').all(b.id),
    hours: db.prepare('SELECT weekday, open_min, close_min FROM hours WHERE business_id = ?').all(b.id),
  });
});

router.patch('/me', requireAuth, (req, res) => {
  const { name, phone, timezone, deposit_cents, google_review_url, address, about } = req.body || {};
  const b = req.business;
  db.prepare(
    `UPDATE businesses SET name = ?, phone = ?, timezone = ?, deposit_cents = ?, google_review_url = ?,
       address = ?, about = ? WHERE id = ?`
  ).run(
    name ?? b.name, phone ?? b.phone, timezone ?? b.timezone,
    Number.isInteger(deposit_cents) ? deposit_cents : b.deposit_cents,
    google_review_url ?? b.google_review_url,
    address ?? b.address, about ?? b.about, b.id
  );
  res.json({ ok: true });
});

// Replace opening hours (array of { weekday, open_min, close_min }; omit a weekday = closed)
router.put('/hours', requireAuth, (req, res) => {
  const { hours } = req.body || {};
  if (!Array.isArray(hours)) return res.status(400).json({ error: 'hours array required' });
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM hours WHERE business_id = ?').run(req.business.id);
    const ins = db.prepare('INSERT INTO hours (business_id, weekday, open_min, close_min) VALUES (?, ?, ?, ?)');
    for (const h of hours) {
      if (
        h && Number.isInteger(h.weekday) && h.weekday >= 0 && h.weekday <= 6 &&
        Number.isInteger(h.open_min) && Number.isInteger(h.close_min) && h.open_min < h.close_min
      ) {
        ins.run(req.business.id, h.weekday, h.open_min, h.close_min);
      }
    }
  });
  tx();
  res.json({ ok: true });
});

router.post('/services', requireAuth, (req, res) => {
  const { name, duration_min, price_cents } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db
    .prepare('INSERT INTO services (business_id, name, duration_min, price_cents) VALUES (?, ?, ?, ?)')
    .run(req.business.id, name, duration_min || 60, price_cents || 5000);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/services/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE services SET active = 0 WHERE id = ? AND business_id = ?').run(req.params.id, req.business.id);
  res.json({ ok: true });
});

router.post('/staff', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const limit = staffLimit(req.business.plan);
  const count = db.prepare('SELECT COUNT(*) c FROM staff WHERE business_id = ? AND active = 1').get(req.business.id).c;
  if (count >= limit) {
    return res.status(403).json({ error: `Your ${req.business.plan} plan allows ${limit} staff. Upgrade to add more.` });
  }
  const info = db.prepare('INSERT INTO staff (business_id, name) VALUES (?, ?)').run(req.business.id, name);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/staff/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE staff SET active = 0 WHERE id = ? AND business_id = ?').run(req.params.id, req.business.id);
  res.json({ ok: true });
});

// ---- Public salon search (real directory: by service + location) ----
// NOTE: registered BEFORE /public/:slug so "search" isn't treated as a slug.
router.get('/public/search', (req, res) => {
  const service = (req.query.service || '').trim();
  const location = (req.query.location || '').trim();

  // The directory is admin-curated AND only shows salons that can actually be
  // booked — otherwise a listing leads to a booking that fails with 403.
  let sql = `SELECT id, name, slug, address, about, deposit_cents, subscription_status, trial_ends_at
             FROM businesses
             WHERE directory_status = 'approved'
               AND TRIM(COALESCE(address, '')) <> ''
               AND EXISTS (SELECT 1 FROM services sv WHERE sv.business_id = businesses.id AND sv.active = 1)
               AND EXISTS (SELECT 1 FROM staff st WHERE st.business_id = businesses.id AND st.active = 1)
               AND EXISTS (SELECT 1 FROM hours h WHERE h.business_id = businesses.id)`;
  const params = [];
  if (location) {
    sql += ' AND address LIKE ?';
    params.push(`%${location}%`);
  }
  if (service) {
    sql += ` AND EXISTS (SELECT 1 FROM services s
             WHERE s.business_id = businesses.id AND s.active = 1 AND s.name LIKE ?)`;
    params.push(`%${service}%`);
  }
  sql += ' ORDER BY name LIMIT 50';

  // Subscription state is a JS rule (isActive), so filter it after the query
  const rows = db.prepare(sql).all(...params).filter(isActive);
  const salons = rows.map((b) => ({
    name: b.name, slug: b.slug, address: b.address, about: b.about, deposit_cents: b.deposit_cents,
    services: db
      .prepare('SELECT name, price_cents, duration_min FROM services WHERE business_id = ? AND active = 1 LIMIT 6')
      .all(b.id),
  }));
  res.json({ salons, query: { service, location } });
});

// ---- Public booking page data ----

router.get('/public/:slug', (req, res) => {
  const b = db.prepare('SELECT * FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Not found' });
  // Card entry on the booking page needs the Web Payments SDK config (public info only)
  const squareLive = square.isConfigured() && !!b.square_connected;
  res.json({
    name: b.name, slug: b.slug, deposit_cents: b.deposit_cents, timezone: b.timezone,
    address: b.address, about: b.about,
    accepting: isActive(b), // false → salon's trial/subscription lapsed
    square: squareLive
      ? { connected: true, app_id: square.APP_ID, location_id: b.square_location_id, sdk_url: square.WEB_SDK_URL }
      : { connected: false },
    services: db
      .prepare('SELECT id, name, duration_min, price_cents FROM services WHERE business_id = ? AND active = 1')
      .all(b.id),
    staff: db.prepare('SELECT id, name FROM staff WHERE business_id = ? AND active = 1').all(b.id),
    hours: db.prepare('SELECT weekday, open_min, close_min FROM hours WHERE business_id = ?').all(b.id),
  });
});

module.exports = router;
