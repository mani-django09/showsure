// SMS wrapper — uses Twilio when creds exist, otherwise logs to console (dev mode).
//
// GO-LIVE (Twilio):
//  1. Buy a US number in the Twilio console → TWILIO_FROM_NUMBER
//  2. REQUIRED for US texting: register an A2P 10DLC brand + campaign
//     (Twilio console → Messaging → Regulatory compliance). Takes 1-3 weeks — start early.
//  3. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER in .env
const { db } = require('../db');

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[sms] Twilio LIVE mode');
  } catch (e) {
    console.warn('[sms] twilio package not installed, falling back to dev mode');
  }
}

// Normalize US phone input ("(555) 123-4567", "555.123.4567") to E.164 (+15551234567).
function toE164(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const only = digits.replace(/\D/g, '');
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith('1')) return `+${only}`;
  return `+${only}`; // last resort — Twilio will validate
}

async function sendSms(to, body) {
  const e164 = toE164(to);
  if (twilioClient && process.env.TWILIO_FROM_NUMBER) {
    return twilioClient.messages.create({ to: e164, from: process.env.TWILIO_FROM_NUMBER, body });
  }
  console.log(`[sms:dev] to=${e164} :: ${body}`);
}

// Send once per (booking, type) — safe to call repeatedly.
// SMS failures are logged but never break the booking flow.
async function sendBookingSms(booking, type, body) {
  const dup = db
    .prepare('SELECT 1 FROM sms_log WHERE booking_id = ? AND type = ?')
    .get(booking.id, type);
  if (dup) return false;
  try {
    await sendSms(booking.customer_phone, body);
  } catch (e) {
    console.error(`[sms] send failed (${type}, booking #${booking.id}):`, e.message);
    return false; // not logged as sent — reminder loop will retry next tick
  }
  db.prepare('INSERT INTO sms_log (booking_id, type) VALUES (?, ?)').run(booking.id, type);
  return true;
}

function fmtTime(startMin) {
  const h24 = Math.floor(startMin / 60);
  const m = String(startMin % 60).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m} ${ampm}`;
}

module.exports = { sendSms, sendBookingSms, fmtTime, toE164 };
