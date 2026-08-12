const rateLimit = require('express-rate-limit');

// Brute-force protection on login/signup — 10 attempts per IP per 15 min.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

// Stops one IP from spamming bookings (which each trigger a real Square hold + SMS).
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts. Please wait a moment and try again.' },
});

module.exports = { authLimiter, bookingLimiter };
