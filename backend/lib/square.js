// Square API client — uses each SALON'S OWN OAuth tokens (direct charges).
// We are only the software layer; deposits land in the salon's Square account.
//
// Setup (go-live):
//  1. developer.squareup.com → create app → get SQUARE_APP_ID / SQUARE_APP_SECRET
//  2. In the Square app settings, register the OAuth redirect URL:
//       {BACKEND_PUBLIC_URL}/api/square/callback
//  3. SQUARE_ENV=sandbox for testing (test cards), production for real money.
const crypto = require('crypto');
const { db } = require('../db');

const ENV = process.env.SQUARE_ENV === 'production' ? 'production' : 'sandbox';
const BASE = ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
const WEB_SDK_URL = ENV === 'production'
  ? 'https://web.squarecdn.com/v1/square.js'
  : 'https://sandbox.web.squarecdn.com/v1/square.js';
const APP_ID = process.env.SQUARE_APP_ID || '';
const APP_SECRET = process.env.SQUARE_APP_SECRET || '';
const SQUARE_VERSION = '2025-01-23';

const isConfigured = () => !!(APP_ID && APP_SECRET);

async function sq(path, { method = 'POST', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors?.[0]?.detail || data.errors?.[0]?.code || `HTTP ${res.status}`;
    const err = new Error(`Square: ${detail}`);
    err.square = data.errors;
    throw err;
  }
  return data;
}

// ---- OAuth ----

function redirectUri() {
  return `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5055'}/api/square/callback`;
}

// NOTE: Square's authorize endpoint takes ONLY client_id/scope/state (+locale/session).
// The redirect target comes from the Redirect URL registered in the Developer Dashboard.
function authorizeUrl(state) {
  const scopes = ['PAYMENTS_WRITE', 'PAYMENTS_READ', 'MERCHANT_PROFILE_READ'].join('+');
  return `${BASE}/oauth2/authorize?client_id=${APP_ID}&scope=${scopes}&state=${encodeURIComponent(state)}`;
}

async function exchangeCode(code) {
  return sq('/oauth2/token', {
    body: {
      client_id: APP_ID, client_secret: APP_SECRET, code,
      grant_type: 'authorization_code', redirect_uri: redirectUri(),
    },
  });
}

async function refreshToken(refresh_token) {
  return sq('/oauth2/token', {
    body: { client_id: APP_ID, client_secret: APP_SECRET, refresh_token, grant_type: 'refresh_token' },
  });
}

// Valid access token for a business, auto-refreshing when within 3 days of expiry.
async function getAccessToken(business) {
  const expiresAt = business.square_token_expires_at ? Date.parse(business.square_token_expires_at) : 0;
  const threeDays = 3 * 24 * 3600 * 1000;
  if (business.square_access_token && expiresAt - Date.now() > threeDays) {
    return business.square_access_token;
  }
  if (!business.square_refresh_token) throw new Error('Square not connected');
  const t = await refreshToken(business.square_refresh_token);
  db.prepare(
    `UPDATE businesses SET square_access_token = ?, square_refresh_token = ?, square_token_expires_at = ? WHERE id = ?`
  ).run(t.access_token, t.refresh_token || business.square_refresh_token, t.expires_at || '', business.id);
  return t.access_token;
}

async function fetchMainLocation(token) {
  const d = await sq('/v2/locations', { method: 'GET', token });
  const loc = (d.locations || []).find((l) => l.status === 'ACTIVE') || d.locations?.[0];
  if (!loc) throw new Error('Square: no location on this account');
  return loc.id;
}

// ---- Payments (direct charges on the salon's account) ----

// Authorization only (autocomplete:false) — money is held, not captured.
async function createHold(business, amountCents, sourceId, note) {
  const token = await getAccessToken(business);
  const d = await sq('/v2/payments', {
    token,
    body: {
      source_id: sourceId,
      idempotency_key: crypto.randomUUID(),
      amount_money: { amount: amountCents, currency: 'USD' },
      location_id: business.square_location_id,
      autocomplete: false,
      note: note || 'ShowSure no-show deposit',
    },
  });
  return d.payment;
}

async function capturePayment(business, paymentId) {
  const token = await getAccessToken(business);
  return sq(`/v2/payments/${paymentId}/complete`, { token, body: {} });
}

async function cancelPayment(business, paymentId) {
  const token = await getAccessToken(business);
  return sq(`/v2/payments/${paymentId}/cancel`, { token, body: {} });
}

module.exports = {
  ENV, APP_ID, WEB_SDK_URL, isConfigured,
  authorizeUrl, exchangeCode, refreshToken, getAccessToken, fetchMainLocation,
  createHold, capturePayment, cancelPayment,
};
