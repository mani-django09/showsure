const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { requireAuth } = require('./auth');
const square = require('../lib/square');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';

// Status for the dashboard
router.get('/square/status', requireAuth, (req, res) => {
  res.json({
    configured: square.isConfigured(),
    connected: !!req.business.square_connected,
    env: square.ENV,
  });
});

// Step 1: dashboard asks for the authorize URL (state = short-lived signed token)
router.get('/square/connect', requireAuth, (req, res) => {
  if (!square.isConfigured()) {
    return res.status(400).json({ error: 'Square keys not configured on the server yet' });
  }
  const state = jwt.sign({ sq: req.business.id }, JWT_SECRET, { expiresIn: '15m' });
  res.json({ url: square.authorizeUrl(state) });
});

// Step 2: Square redirects the browser here after the salon approves
router.get('/square/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const fail = (msg) => res.redirect(`${FRONTEND}/dashboard?square=error&msg=${encodeURIComponent(msg)}`);
  if (error) return fail(error);
  if (!code || !state) return fail('Missing code');

  let businessId;
  try {
    businessId = jwt.verify(state, JWT_SECRET).sq;
  } catch {
    return fail('Invalid or expired state — try connecting again');
  }

  try {
    const t = await square.exchangeCode(code);
    const locationId = await square.fetchMainLocation(t.access_token);
    db.prepare(
      `UPDATE businesses SET square_connected = 1, square_access_token = ?, square_refresh_token = ?,
         square_token_expires_at = ?, square_merchant_id = ?, square_location_id = ? WHERE id = ?`
    ).run(t.access_token, t.refresh_token || '', t.expires_at || '', t.merchant_id || '', locationId, businessId);
    res.redirect(`${FRONTEND}/dashboard?square=connected`);
  } catch (e) {
    console.error('[square] oauth callback failed:', e.message);
    fail(e.message);
  }
});

router.post('/square/disconnect', requireAuth, (req, res) => {
  db.prepare(
    `UPDATE businesses SET square_connected = 0, square_access_token = '', square_refresh_token = '',
       square_token_expires_at = '', square_merchant_id = '', square_location_id = '' WHERE id = ?`
  ).run(req.business.id);
  res.json({ ok: true });
});

module.exports = router;
