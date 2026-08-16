// Inbound Twilio SMS webhook — powers "Reply YES to claim it" on waitlist texts.
//
// Twilio POSTs application/x-www-form-urlencoded here whenever a customer
// replies to any text from our number. We look up the most recent unclaimed
// waitlist notification for that phone number and, if they said yes, book
// them into the earliest still-open slot for that day.
//
// NOTE: SMS can't collect a card, so these bookings are created with
// deposit_status='none' — a recovered booking without deposit protection is
// still real revenue, and the salon can see it's an SMS-claimed slot.
const express = require('express');
const crypto = require('crypto');
const twilio = require('twilio');
const { db } = require('../db');
const { toE164, fmtTime } = require('../lib/sms');
const { safeNowInTz } = require('../lib/time');
const { computeSlots } = require('./bookings');

const router = express.Router();

// Twilio signs each webhook request; verifying it stops anyone else from
// POSTing fake "From"/"Body" pairs and claiming slots for someone else's number.
function isValidTwilioRequest(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const url = process.env.SMS_WEBHOOK_URL;
  if (!authToken || !url) return false; // never trust an unverifiable request
  const signature = req.headers['x-twilio-signature'];
  try {
    // twilio.validateRequest throws (not just returns false) on a malformed
    // URL — never let that escape as an uncaught rejection and take the
    // whole process down with it.
    return twilio.validateRequest(authToken, signature || '', url, req.body || {});
  } catch (e) {
    console.error('[sms:inbound] signature check errored:', e.message);
    return false;
  }
}

const YES_RE = /^\s*y(es)?\s*!?\s*$/i;

// POST /api/sms/inbound
router.post('/sms/inbound', async (req, res) => {
  res.type('text/xml'); // Twilio always expects TwiML back, even for a no-op

  if (!isValidTwilioRequest(req)) {
    console.warn('[sms:inbound] rejected — bad or missing Twilio signature');
    return res.status(403).send('<Response></Response>');
  }

  const from = toE164(req.body.From || '');
  const body = String(req.body.Body || '');
  if (!from || !YES_RE.test(body)) {
    // Not a claim attempt (or not from a real number) — stay silent rather
    // than auto-replying to unrelated texts.
    return res.send('<Response></Response>');
  }

  let msg = null;
  try {
    msg = claim(from);
  } catch (e) {
    console.error('[sms:inbound] claim failed:', e.message);
  }
  res.send(`<Response>${msg ? `<Message>${escapeXml(msg)}</Message>` : ''}</Response>`);
});

// Synchronous by design (better-sqlite3 calls don't yield) — the find-slot-then-
// insert sequence below has no `await` in between, so two replies racing for
// the same last-open slot can't both succeed.
function claim(fromE164) {
  const entry = db
    .prepare(
      `SELECT * FROM waitlist
       WHERE customer_phone = ? AND notified = 1 AND claimed_at = ''
       ORDER BY notified_at DESC LIMIT 1`
    )
    .get(fromE164);
  if (!entry) return null; // no pending "spot opened up" text for this number

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(entry.business_id);
  const today = safeNowInTz(business.timezone).date;
  if (entry.date < today) {
    db.prepare(`UPDATE waitlist SET claimed_at = datetime('now') WHERE id = ?`).run(entry.id); // stop re-matching a stale entry
    return `That date has passed. Book a new time: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/s/${business.slug}`;
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(entry.service_id);
  if (!service) return null;

  const staffCandidates = entry.staff_id
    ? [db.prepare('SELECT * FROM staff WHERE id = ? AND active = 1').get(entry.staff_id)].filter(Boolean)
    : db.prepare('SELECT * FROM staff WHERE business_id = ? AND active = 1').all(business.id);

  let picked = null;
  for (const staff of staffCandidates) {
    const slots = computeSlots(business, service, staff.id, entry.date);
    if (slots.length) { picked = { staff, start_min: slots[0] }; break; }
  }

  if (!picked) {
    return `Sorry, that opening was just taken. Check other times: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/s/${business.slug}`;
  }

  const cancel_token = crypto.randomBytes(16).toString('hex');
  const end_min = picked.start_min + service.duration_min;
  db.prepare(
    `INSERT INTO bookings (business_id, service_id, staff_id, customer_name, customer_phone,
      date, start_min, end_min, cancel_token, deposit_cents_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(business.id, service.id, picked.staff.id, entry.customer_name, fromE164, entry.date, picked.start_min, end_min, cancel_token);

  db.prepare(`UPDATE waitlist SET claimed_at = datetime('now') WHERE id = ?`).run(entry.id);

  return (
    `You're booked! ${service.name} at ${business.name} on ${entry.date} ${fmtTime(picked.start_min)}. ` +
    `No deposit needed for text bookings. Manage: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/cancel/${cancel_token}`
  );
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

module.exports = router;
