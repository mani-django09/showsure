// Deposit holds via the SALON'S OWN Square account (direct charges — money never touches us).
// Live mode: Square keys configured AND the salon has connected their account.
// Dev mode:  everything simulated + logged, so the full flow works without any keys.
const square = require('./square');

const isLive = (business) => square.isConfigured() && !!business.square_connected;

// cardToken = source_id from Square Web Payments SDK (tokenized client-side; we never see card numbers)
async function holdDeposit(business, booking, cardToken) {
  if (isLive(business)) {
    if (!cardToken) {
      const err = new Error('Card required to hold the deposit');
      err.code = 'CARD_REQUIRED';
      throw err;
    }
    const payment = await square.createHold(
      business, business.deposit_cents, cardToken,
      `No-show deposit — booking #${booking.id} (${booking.customer_name})`
    );
    return { holdId: payment.id };
  }
  const holdId = `dev_hold_${booking.id}_${Date.now()}`;
  console.log(
    `[deposits:dev] HOLD $${(business.deposit_cents / 100).toFixed(2)} for booking #${booking.id} -> ${holdId}`
  );
  return { holdId };
}

async function captureDeposit(business, booking) {
  if (isLive(business) && !booking.deposit_hold_id.startsWith('dev_hold_')) {
    await square.capturePayment(business, booking.deposit_hold_id);
    return;
  }
  console.log(`[deposits:dev] CAPTURE ${booking.deposit_hold_id} (no-show charge)`);
}

async function releaseDeposit(business, booking) {
  if (isLive(business) && !booking.deposit_hold_id.startsWith('dev_hold_')) {
    await square.cancelPayment(business, booking.deposit_hold_id);
    return;
  }
  console.log(`[deposits:dev] RELEASE ${booking.deposit_hold_id}`);
}

module.exports = { holdDeposit, captureDeposit, releaseDeposit };
