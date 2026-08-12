require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

require('./db'); // creates tables
const { router: authRouter } = require('./routes/auth');
const businessRouter = require('./routes/business');
const bookingsRouter = require('./routes/bookings');
const squareRouter = require('./routes/square');
const { router: billingRouter, handleWebhook } = require('./routes/billing');
const { startReminderLoop } = require('./lib/reminders');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3001' }));

// Lemon Squeezy webhook needs the RAW body for signature verification — mount before json()
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), handleWebhook);

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api', businessRouter);
app.use('/api', bookingsRouter);
app.use('/api', squareRouter);
app.use('/api', billingRouter);

const PORT = process.env.PORT || 5055;
app.listen(PORT, () => {
  console.log(`ShowSure backend on http://localhost:${PORT}`);
  startReminderLoop();
});
