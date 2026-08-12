const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('./auth');
const ls = require('../lib/lemonsqueezy');
const { PLANS, isActive, trialDaysLeft, planFromVariant } = require('../lib/plans');

const router = express.Router();
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';
const VARIANT_ENV = { starter: 'LS_VARIANT_STARTER', pro: 'LS_VARIANT_PRO', growth: 'LS_VARIANT_GROWTH' };

// Current plan/trial status for the dashboard
router.get('/billing/status', requireAuth, (req, res) => {
  const b = req.business;
  res.json({
    plan: b.plan,
    subscription_status: b.subscription_status || 'inactive',
    active: isActive(b),
    trial_days_left: trialDaysLeft(b),
    current_period_end: b.current_period_end || '',
    configured: ls.isConfigured(),
    plans: Object.entries(PLANS)
      .filter(([k]) => k !== 'trial' && k !== 'none')
      .map(([key, v]) => ({ key, label: v.label, price: v.price, staff: v.staff === Infinity ? 'Unlimited' : v.staff })),
  });
});

// Start a checkout — returns a URL to redirect the salon to
router.post('/billing/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body || {};
  if (!['starter', 'pro', 'growth'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  // Dev mode (no LS keys): simulate an instant successful subscription so gating is testable
  if (!ls.isConfigured()) {
    db.prepare(
      `UPDATE businesses SET plan = ?, subscription_status = 'active', current_period_end = ? WHERE id = ?`
    ).run(plan, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), req.business.id);
    return res.json({ url: `${FRONTEND}/dashboard?billing=success&dev=1`, dev: true });
  }

  const variantId = process.env[VARIANT_ENV[plan]];
  if (!variantId) return res.status(400).json({ error: `No Lemon Squeezy variant configured for ${plan}` });
  try {
    const url = await ls.createCheckout({
      variantId,
      businessId: req.business.id,
      email: req.business.email,
      redirectUrl: `${FRONTEND}/dashboard?billing=success`,
    });
    res.json({ url });
  } catch (e) {
    console.error('[billing] checkout failed:', e.message);
    res.status(502).json({ error: e.message });
  }
});

// Webhook (raw body mounted in server.js). Updates plan/status from Lemon Squeezy.
function handleWebhook(req, res) {
  const signature = req.get('X-Signature');
  const raw = req.body; // Buffer
  if (!ls.verifyWebhook(raw, signature)) return res.status(401).send('bad signature');

  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('bad json'); }

  const name = event.meta?.event_name;
  const businessId = event.meta?.custom_data?.business_id;
  const attr = event.data?.attributes || {};
  const subId = event.data?.id;
  if (!businessId) return res.status(200).send('no business id');

  if (['subscription_created', 'subscription_updated', 'subscription_resumed', 'subscription_unpaused'].includes(name)) {
    const plan = planFromVariant(attr.variant_id);
    db.prepare(
      `UPDATE businesses SET plan = ?, subscription_status = ?, ls_subscription_id = ?, ls_customer_id = ?,
         current_period_end = ? WHERE id = ?`
    ).run(plan, attr.status || 'active', subId || '', String(attr.customer_id || ''), attr.renews_at || '', businessId);
  } else if (['subscription_cancelled', 'subscription_expired'].includes(name)) {
    db.prepare(`UPDATE businesses SET subscription_status = ? WHERE id = ?`)
      .run(name === 'subscription_expired' ? 'expired' : 'cancelled', businessId);
  }
  res.status(200).send('ok');
}

module.exports = { router, handleWebhook };
