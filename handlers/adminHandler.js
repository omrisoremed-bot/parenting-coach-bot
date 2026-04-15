'use strict';

const express   = require('express');
const rateLimit = require('express-rate-limit');
const router    = express.Router();
const { getDb }     = require('../services/database');
const { loadProfile, saveProfile } = require('./profileLoader');
const { sendMorningPlans }   = require('../cron/morningPlan');
const { sendEveningCheckins } = require('../cron/eveningCheckin');
const { sendWeeklyReviews }   = require('../cron/weeklyReview');
const logger = require('../services/logger');

// ─── Rate limit — 20 requêtes / 15 min par IP ────────────────────────────────
// Protège contre le brute-force du ADMIN_TOKEN
const adminLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 min
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'too_many_requests', retry_after_minutes: 15 }
});

router.use(adminLimiter);

// ─── Auth token ──────────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(adminAuth);

// ─── GET /admin/users — liste paginée (sans colonnes JSON lourdes) ──────────
// ?page=1&limit=50 — max 100 par page
router.get('/users', (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const offset = (page - 1) * limit;

  const db    = getDb();
  const total = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

  // Projection légère — exclut parent/children/challenges/weekly_checkins (JSON volumineux)
  // Utiliser GET /admin/users/:phone pour le profil complet
  const rows = db.prepare(`
    SELECT phone, language, cron_active, onboarding_complete,
           created_at, last_active, session_state, parenting_style
    FROM users
    ORDER BY last_active DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    users: rows
  });
});

// ─── GET /admin/users/:phone — profil complet d'un utilisateur ──────────────
router.get('/users/:phone', (req, res) => {
  const profile = loadProfile(req.params.phone);
  if (!profile) return res.status(404).json({ error: 'User not found' });
  res.json(profile);
});

// ─── PUT /admin/users/:phone — mise à jour (champs whitélistés) ─────────────
const ADMIN_EDITABLE_FIELDS = [
  'language', 'cron_active', 'parenting_style', 'cultural_context',
  'parent', 'children', 'challenges', 'weekly_checkins'
];

router.put('/users/:phone', express.json(), (req, res) => {
  const existing = loadProfile(req.params.phone);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const patch = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ADMIN_EDITABLE_FIELDS.includes(k))
  );

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'no_valid_fields', allowed: ADMIN_EDITABLE_FIELDS });
  }

  const updated = { ...existing, ...patch };
  saveProfile(req.params.phone, updated);
  logger.info('Admin updated profile', { phone: req.params.phone, fields: Object.keys(patch) });
  res.json(updated);
});

// ─── Triggers manuels ────────────────────────────────────────────────────────
router.post('/trigger/morning', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendMorningPlans().catch(err =>
    logger.error('Admin morning trigger failed', { error: err.message })
  );
});

router.post('/trigger/evening', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendEveningCheckins().catch(err =>
    logger.error('Admin evening trigger failed', { error: err.message })
  );
});

router.post('/trigger/weekly', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendWeeklyReviews().catch(err =>
    logger.error('Admin weekly trigger failed', { error: err.message })
  );
});

module.exports = router;
