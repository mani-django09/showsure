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
const STOP_RE = /^\s*(stop|unsubscribe|cancel|end|quit|help)\s*$/i;

// POST /api/sms/inbound
router.post('/sms/inbound', async (req, res) => {
  res.type('text/xml'); // Twilio always expects TwiML back, even for a no-op

  if (!isValidTwilioRequest(req)) {
    console.warn('[sms:inbound] rejected — bad or missing Twilio signature');
    return res.status(403).send('<Response></Response>');
  }

  const from = toE164(req.body.From || '');
  const body = String(req.body.Body || '').trim();
  if (!from || !body) return res.send('<Response></Response>');

  let msg = null;
  try {
    if (YES_RE.test(body)) {
      msg = claim(from);
    } else if (!STOP_RE.test(body) && body.length >= 3) {
      // Anything else that looks like a real question goes to the AI
      // concierge — grounded in this salon's own hours/services, nothing else.
      msg = await concierge(from, body);
    }
  } catch (e) {
    console.error('[sms:inbound] reply failed:', e.message);
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

// ---- Text-based AI concierge ----
// Answers real questions ("what time do you close Saturday?", "how much is
// a lash fill?") using ONLY this salon's own hours/services as grounding —
// never live availability, never anything that could hallucinate a wrong
// answer a customer might rely on. Anything requiring live data (booking,
// availability, cancelling) gets pointed at the real booking page instead.

const AI_RATE_LIMIT_PER_HOUR = 5; // per phone number, across all salons

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function formatHours(hoursRows) {
  if (!hoursRows.length) return 'Hours not listed — please contact the salon directly.';
  const byDay = new Map(hoursRows.map((h) => [h.weekday, h]));
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const h = byDay.get(i);
    if (!h) continue; // closed that day
    let j = i;
    while (j + 1 < 7) {
      const next = byDay.get(j + 1);
      if (!next || next.open_min !== h.open_min || next.close_min !== h.close_min) break;
      j++;
    }
    const range = i === j ? DAY_NAMES[i] : `${DAY_NAMES[i]}-${DAY_NAMES[j]}`;
    parts.push(`${range} ${fmtTime(h.open_min)}-${fmtTime(h.close_min)}`);
    i = j;
  }
  return parts.join(', ') || 'Closed all week';
}

function formatServices(services) {
  if (!services.length) return 'No services listed yet.';
  return services.map((s) => `${s.name} ($${(s.price_cents / 100).toFixed(0)}, ${s.duration_min} min)`).join('; ');
}

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null; // feature stays off until configured — never crash for it

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000); // stay well under Twilio's webhook timeout
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error('[sms:concierge] Claude API error', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return text ? text.trim() : null;
  } catch (e) {
    console.error('[sms:concierge] Claude call failed:', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function concierge(fromE164, body) {
  const recent = db
    .prepare(
      `SELECT business_id FROM (
         SELECT business_id, created_at FROM bookings WHERE customer_phone = ?
         UNION ALL
         SELECT business_id, created_at FROM waitlist WHERE customer_phone = ?
       ) ORDER BY created_at DESC LIMIT 1`
    )
    .get(fromE164, fromE164);
  if (!recent) return null; // no idea which salon this is about — stay silent

  const rateCount = db
    .prepare(`SELECT COUNT(*) c FROM sms_ai_log WHERE customer_phone = ? AND created_at > datetime('now', '-1 hour')`)
    .get(fromE164).c;
  if (rateCount >= AI_RATE_LIMIT_PER_HOUR) return null;

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(recent.business_id);
  if (!business) return null;

  const services = db
    .prepare('SELECT name, price_cents, duration_min FROM services WHERE business_id = ? AND active = 1')
    .all(business.id);
  const hours = db.prepare('SELECT weekday, open_min, close_min FROM hours WHERE business_id = ?').all(business.id);
  const bookingLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/s/${business.slug}`;

  const systemPrompt =
    `You are a concise SMS assistant for "${business.name}", a beauty salon. ` +
    `Answer ONLY using the facts below — never invent hours, prices, services, or availability. ` +
    `Keep replies under 300 characters, friendly, no markdown, no emoji spam.\n\n` +
    `Hours: ${formatHours(hours)}\n` +
    `Services: ${formatServices(services)}\n` +
    `Address: ${business.address || 'not listed'}\n\n` +
    `You do NOT have live appointment availability. For booking, cancelling, rescheduling, or ` +
    `"what's open" questions, tell them to use: ${bookingLink}\n` +
    `If a question isn't about this salon's hours, services, pricing or location, politely say you can only help with that.`;

  const reply = await callClaude(systemPrompt, body);
  if (!reply) return null;

  db.prepare('INSERT INTO sms_ai_log (business_id, customer_phone) VALUES (?, ?)').run(business.id, fromE164);
  return reply.length > 300 ? `${reply.slice(0, 297)}...` : reply;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

module.exports = router;
