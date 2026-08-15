// Revenue recovery: win-back SMS for customers who haven't completed a
// visit in a while. Runs hourly (no need for per-minute precision like
// the reminder loop — a 90-day threshold doesn't need to be exact to the minute).
const { db } = require('../db');
const { sendSms } = require('./sms');
const { safeNowInTz } = require('./time');

const WINBACK_DAYS = 90;

function daysAgo(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function tick() {
  const businesses = db.prepare('SELECT * FROM businesses').all();
  for (const b of businesses) {
    const now = safeNowInTz(b.timezone);
    const cutoffDate = daysAgo(now.date, WINBACK_DAYS);

    const dormant = db
      .prepare(
        `SELECT customer_phone AS phone, MAX(customer_name) AS name, MAX(date) AS last_visit
         FROM bookings
         WHERE business_id = ? AND status = 'completed'
         GROUP BY customer_phone
         HAVING last_visit <= ?`
      )
      .all(b.id, cutoffDate);

    for (const c of dormant) {
      const recent = db
        .prepare(
          `SELECT sent_at FROM reactivation_log
           WHERE business_id = ? AND customer_phone = ?
           ORDER BY sent_at DESC LIMIT 1`
        )
        .get(b.id, c.phone);

      // Only one win-back message per dormancy period — skip if we already
      // sent one since their last completed visit.
      if (recent && recent.sent_at.slice(0, 10) >= c.last_visit) continue;

      try {
        await sendSms(
          c.phone,
          `We miss you at ${b.name}! It's been a while — come back and book your ` +
          `next visit: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/s/${b.slug}`
        );
        db.prepare('INSERT INTO reactivation_log (business_id, customer_phone) VALUES (?, ?)').run(b.id, c.phone);
      } catch (e) {
        console.error('[reactivation] send failed:', e.message);
      }
    }
  }
}

function startReactivationLoop() {
  setInterval(() => tick().catch((e) => console.error('[reactivation]', e)), 60 * 60 * 1000);
  console.log('[reactivation] loop started (hourly, 90-day win-back)');
}

module.exports = { startReactivationLoop };
