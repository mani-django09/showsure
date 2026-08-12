// Timezone helpers shared by bookings (validation) and reminders (scheduling).

// "Now" as { date: 'YYYY-MM-DD', min: minutesFromMidnight } in a given IANA timezone
function nowInTz(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, min: (+get('hour') % 24) * 60 + +get('minute') };
}

function safeNowInTz(tz) {
  try { return nowInTz(tz || 'America/New_York'); }
  catch { return nowInTz('America/New_York'); }
}

module.exports = { nowInTz, safeNowInTz };
