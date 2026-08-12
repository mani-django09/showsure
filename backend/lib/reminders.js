// Reminder loop — every minute, find confirmed bookings needing 24h / 2h reminders.
// Times are compared in each business's own timezone (America/New_York etc.).
const { db } = require('./../db');
const { sendBookingSms, fmtTime } = require('./sms');
const { safeNowInTz } = require('./time');

// Minutes until booking start (can be negative if already started)
function minutesUntil(booking, now) {
  const dayDiff = Math.round(
    (new Date(`${booking.date}T00:00:00Z`) - new Date(`${now.date}T00:00:00Z`)) / 86400000
  );
  return dayDiff * 1440 + booking.start_min - now.min;
}

async function tick() {
  const businesses = db.prepare('SELECT * FROM businesses').all();
  for (const b of businesses) {
    const now = safeNowInTz(b.timezone);

    const upcoming = db
      .prepare(
        `SELECT bk.*, s.name AS service_name FROM bookings bk
         JOIN services s ON s.id = bk.service_id
         WHERE bk.business_id = ? AND bk.status = 'confirmed' AND bk.date >= ?`
      )
      .all(b.id, now.date);

    for (const bk of upcoming) {
      const mins = minutesUntil(bk, now);
      if (mins <= 0) continue;
      if (mins <= 24 * 60 && mins > 23 * 60) {
        await sendBookingSms(
          bk, 'remind_24h',
          `Reminder: ${bk.service_name} at ${b.name} tomorrow ${fmtTime(bk.start_min)}. Need to cancel? ` +
          `${process.env.FRONTEND_URL || 'http://localhost:3001'}/cancel/${bk.cancel_token}`
        );
      }
      if (mins <= 120 && mins > 60) {
        await sendBookingSms(bk, 'remind_2h', `See you at ${fmtTime(bk.start_min)} today at ${b.name}!`);
      }
    }
  }
}

function startReminderLoop() {
  setInterval(() => tick().catch((e) => console.error('[reminders]', e)), 60 * 1000);
  console.log('[reminders] loop started (every 60s)');
}

module.exports = { startReminderLoop };
