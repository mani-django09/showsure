// Admin-only routes for curating the public salon directory.
//
// Anyone can sign up and get their own booking page (that's the paid product),
// but a salon only appears in /search after an admin approves it here — so the
// public directory can't be filled with spam or fake listings.
//
// Auth is a single shared secret in ADMIN_SECRET, sent as `x-admin-secret`.
// If ADMIN_SECRET is unset the whole router refuses, so a misconfigured deploy
// fails closed rather than exposing the endpoints.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { isActive } = require('../lib/plans');

const router = express.Router();

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: 'Admin access is not configured' });
  const given = req.headers['x-admin-secret'] || '';
  if (!given || !timingSafeEqual(given, secret)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/admin/businesses — every salon with the info needed to judge a listing
router.get('/admin/businesses', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.slug, b.email, b.address, b.about, b.created_at,
              b.plan, b.subscription_status, b.trial_ends_at, b.square_connected,
              b.directory_status,
              (SELECT COUNT(*) FROM services s WHERE s.business_id = b.id AND s.active = 1) AS services,
              (SELECT COUNT(*) FROM staff st WHERE st.business_id = b.id AND st.active = 1) AS staff,
              (SELECT COUNT(*) FROM hours h WHERE h.business_id = b.id) AS hours,
              (SELECT COUNT(*) FROM bookings bk WHERE bk.business_id = b.id) AS bookings
       FROM businesses b
       ORDER BY (b.directory_status = 'pending') DESC, b.created_at DESC`
    )
    .all();

  // Tell the admin whether this salon would actually show up once approved
  const businesses = rows.map((b) => ({
    ...b,
    subscription_active: isActive(b),
    listing_ready:
      isActive(b) && !!(b.address || '').trim() && b.services > 0 && b.staff > 0 && b.hours > 0,
  }));
  res.json({ businesses });
});

// PATCH /api/admin/businesses/:id/directory  { status: approved | rejected | pending }
router.patch('/admin/businesses/:id/directory', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved, rejected or pending' });
  }
  const biz = db.prepare('SELECT id FROM businesses WHERE id = ?').get(req.params.id);
  if (!biz) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE businesses SET directory_status = ? WHERE id = ?').run(status, biz.id);
  res.json({ ok: true, id: biz.id, directory_status: status });
});

module.exports = router;
