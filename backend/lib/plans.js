// Plan config + access rules. The salon's subscription to ShowSure.
const PLANS = {
  trial:   { label: 'Free trial', staff: Infinity, price: 0 },
  starter: { label: 'Starter', staff: 1, price: 29, variantEnv: 'LS_VARIANT_STARTER' },
  pro:     { label: 'Pro', staff: 5, price: 59, variantEnv: 'LS_VARIANT_PRO' },
  growth:  { label: 'Growth', staff: Infinity, price: 99, variantEnv: 'LS_VARIANT_GROWTH' },
};

// Subscription statuses that count as "paying / in good standing"
const ACTIVE_SUB = new Set(['active', 'on_trial', 'past_due']);

// Is the salon allowed to operate (accept bookings)?
function isActive(b) {
  if (ACTIVE_SUB.has(b.subscription_status)) return true;
  // Still within the free trial
  if ((!b.subscription_status || b.subscription_status === 'trialing') && b.trial_ends_at) {
    return Date.parse(b.trial_ends_at) > Date.now();
  }
  return false;
}

function trialDaysLeft(b) {
  if (!b.trial_ends_at) return 0;
  return Math.max(0, Math.ceil((Date.parse(b.trial_ends_at) - Date.now()) / (24 * 3600 * 1000)));
}

function staffLimit(plan) {
  return PLANS[plan]?.staff ?? Infinity;
}

// Which plan a Lemon Squeezy variant id maps to (reads env at call time)
function planFromVariant(variantId) {
  const v = String(variantId);
  if (v && v === process.env.LS_VARIANT_GROWTH) return 'growth';
  if (v && v === process.env.LS_VARIANT_PRO) return 'pro';
  if (v && v === process.env.LS_VARIANT_STARTER) return 'starter';
  return 'starter';
}

module.exports = { PLANS, isActive, trialDaysLeft, staffLimit, planFromVariant };
