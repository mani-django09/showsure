// Lemon Squeezy (Merchant of Record) — how salons pay ShowSure.
// India-friendly: no US entity, no Stripe. LS handles tax/compliance, pays out to us.
//
// Setup (go-live):
//  1. lemonsqueezy.com → create store + 3 subscription products ($29/$59/$99)
//  2. Grab each variant id → LS_VARIANT_STARTER / _PRO / _GROWTH
//  3. Settings → API → create key → LEMONSQUEEZY_API_KEY, note LS_STORE_ID
//  4. Settings → Webhooks → add {BACKEND_PUBLIC_URL}/api/billing/webhook,
//     events: subscription_*, signing secret → LEMONSQUEEZY_WEBHOOK_SECRET
const crypto = require('crypto');

const API = 'https://api.lemonsqueezy.com/v1';
const key = () => process.env.LEMONSQUEEZY_API_KEY || '';
const storeId = () => process.env.LS_STORE_ID || '';
const isConfigured = () => !!(key() && storeId());

async function createCheckout({ variantId, businessId, email, redirectUrl }) {
  const res = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: { email, custom: { business_id: String(businessId) } },
          product_options: { redirect_url: redirectUrl },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(storeId()) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.[0]?.detail || `Lemon Squeezy HTTP ${res.status}`);
  return data.data.attributes.url;
}

// Verify the X-Signature HMAC (sha256 of the raw request body)
function verifyWebhook(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { isConfigured, createCheckout, verifyWebhook };
