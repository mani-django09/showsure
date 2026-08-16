const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'showsure.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  timezone TEXT DEFAULT 'America/New_York',
  deposit_cents INTEGER DEFAULT 2000,        -- default $20 deposit
  google_review_url TEXT DEFAULT '',
  plan TEXT DEFAULT 'none',                  -- none | starter | pro | growth
  square_connected INTEGER DEFAULT 0,        -- 1 after Square OAuth
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 5000,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

-- Business-level opening hours per weekday (0=Sunday .. 6=Saturday).
-- open_min/close_min are minutes from midnight; row absent = closed that day.
CREATE TABLE IF NOT EXISTS hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  weekday INTEGER NOT NULL,
  open_min INTEGER NOT NULL,
  close_min INTEGER NOT NULL,
  UNIQUE(business_id, weekday)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date TEXT NOT NULL,                        -- YYYY-MM-DD (business local)
  start_min INTEGER NOT NULL,                -- minutes from midnight
  end_min INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed',           -- confirmed | cancelled | completed | no_show
  deposit_status TEXT DEFAULT 'none',        -- none | held | captured | released
  deposit_hold_id TEXT DEFAULT '',           -- Square payment id (or dev stub)
  cancel_token TEXT NOT NULL,                -- for SMS cancel link
  created_at TEXT DEFAULT (datetime('now'))
);

-- Dedup log so reminders are sent exactly once per (booking, type)
CREATE TABLE IF NOT EXISTS sms_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL,                        -- confirm | remind_24h | remind_2h | no_show | review
  sent_at TEXT DEFAULT (datetime('now')),
  UNIQUE(booking_id, type)
);

-- Customers waiting for a specific day (their preferred slot was full).
-- Revenue-recovery feature: covers both "someone cancelled" and "a no-show
-- freed a slot" — both just mean a matching confirmed booking disappeared,
-- so a single trigger (see bookings.js status PATCH) handles both cases.
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  staff_id INTEGER REFERENCES staff(id),     -- NULL = any staff is fine
  date TEXT NOT NULL,                        -- YYYY-MM-DD they want
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notified INTEGER DEFAULT 0,                -- 1 once we've texted them about an opening
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tracks win-back SMS sends per customer so we don't re-send too often.
CREATE TABLE IF NOT EXISTS reactivation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  customer_phone TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now'))
);
`);

// Lightweight migrations — add columns to existing DBs, ignore if already present
function addColumn(table, colDef) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch {}
}
addColumn('businesses', "address TEXT DEFAULT ''");
addColumn('businesses', "about TEXT DEFAULT ''");
// Square OAuth (salon's own account — direct charges, money never touches us)
addColumn('businesses', "square_access_token TEXT DEFAULT ''");
addColumn('businesses', "square_refresh_token TEXT DEFAULT ''");
addColumn('businesses', "square_token_expires_at TEXT DEFAULT ''");
addColumn('businesses', "square_merchant_id TEXT DEFAULT ''");
addColumn('businesses', "square_location_id TEXT DEFAULT ''");
// Billing — salon's subscription to ShowSure (via Lemon Squeezy, Merchant of Record)
addColumn('businesses', "trial_ends_at TEXT DEFAULT ''");
addColumn('businesses', "subscription_status TEXT DEFAULT 'inactive'"); // inactive|active|past_due|cancelled|expired
addColumn('businesses', "ls_subscription_id TEXT DEFAULT ''");
addColumn('businesses', "ls_customer_id TEXT DEFAULT ''");
addColumn('businesses', "current_period_end TEXT DEFAULT ''");
// Public directory is admin-curated: signing up gives a salon its own booking
// page, but it only appears in /search after an admin approves it.
addColumn('businesses', "directory_status TEXT DEFAULT 'pending'"); // pending | approved | rejected
// Analytics — snapshot the deposit amount at booking time so captured-revenue
// totals stay accurate even after a business changes its deposit_cents later.
addColumn('bookings', 'deposit_cents_snapshot INTEGER DEFAULT 0');
// Two-way SMS waitlist claiming — "Reply YES to claim it"
addColumn('waitlist', "notified_at TEXT DEFAULT ''"); // when we texted them about the opening
addColumn('waitlist', "claimed_at TEXT DEFAULT ''"); // set once they've claimed a slot by reply

// Text-based AI concierge — logs each AI-answered inbound text, doubling as
// a per-phone rate limit so a stray number can't run up the API bill.
db.exec(`
CREATE TABLE IF NOT EXISTS sms_ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  customer_phone TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);
db.exec(`UPDATE bookings SET deposit_cents_snapshot =
  (SELECT deposit_cents FROM businesses WHERE businesses.id = bookings.business_id)
  WHERE deposit_cents_snapshot = 0`);

// Seed default hours (Tue-Sat 9:00-18:00) for a new business
function seedDefaultHours(businessId) {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO hours (business_id, weekday, open_min, close_min) VALUES (?, ?, ?, ?)'
  );
  for (const wd of [2, 3, 4, 5, 6]) ins.run(businessId, wd, 9 * 60, 18 * 60);
}

module.exports = { db, seedDefaultHours };
