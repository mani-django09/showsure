const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seedDefaultHours } = require('../db');
const { authLimiter } = require('../lib/rateLimit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Auth middleware — attaches req.business
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(payload.id);
    if (!business) return res.status(401).json({ error: 'Unauthorized' });
    req.business = business;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

router.post('/signup', authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });

  const existing = db.prepare('SELECT id FROM businesses WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  // Unique slug: glow-studio, glow-studio-2, ...
  let slug = slugify(name) || 'salon';
  let n = 1;
  while (db.prepare('SELECT id FROM businesses WHERE slug = ?').get(n === 1 ? slug : `${slug}-${n}`)) n++;
  if (n > 1) slug = `${slug}-${n}`;

  const hash = await bcrypt.hash(password, 10);
  const trialEnds = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const info = db
    .prepare(
      'INSERT INTO businesses (name, slug, email, password_hash, trial_ends_at, subscription_status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, slug, email.toLowerCase(), hash, trialEnds, 'trialing');
  seedDefaultHours(info.lastInsertRowid);

  const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, slug });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const business = db.prepare('SELECT * FROM businesses WHERE email = ?').get((email || '').toLowerCase());
  if (!business || !(await bcrypt.compare(password || '', business.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: business.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, slug: business.slug });
});

module.exports = { router, requireAuth };
