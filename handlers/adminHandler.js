'use strict';

const express = require('express');
const router = express.Router();
const { getAllUsers, loadProfile, saveProfile } = require('./profileLoader');
const { sendMorningPlans } = require('../cron/morningPlan');
const { sendEveningCheckins } = require('../cron/eveningCheckin');
const { sendWeeklyReviews } = require('../cron/weeklyReview');
const logger = require('../services/logger');

// Simple token-based auth for admin routes
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(adminAuth);

// GET /admin/users — list all user profiles
router.get('/users', (req, res) => {
  const users = getAllUsers();
  res.json({ count: users.length, users });
});

// GET /admin/users/:phone — get a single profile
router.get('/users/:phone', (req, res) => {
  const profile = loadProfile(req.params.phone);
  if (!profile) return res.status(404).json({ error: 'User not found' });
  res.json(profile);
});

// PUT /admin/users/:phone — update a profile
router.put('/users/:phone', express.json(), (req, res) => {
  const existing = loadProfile(req.params.phone);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const updated = { ...existing, ...req.body };
  saveProfile(req.params.phone, updated);
  logger.info('Admin updated profile', { phone: req.params.phone });
  res.json(updated);
});

// POST /admin/trigger/morning — manually trigger morning plans
router.post('/trigger/morning', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendMorningPlans().catch(err =>
    logger.error('Admin morning trigger failed', { error: err.message })
  );
});

// POST /admin/trigger/evening — manually trigger evening check-ins
router.post('/trigger/evening', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendEveningCheckins().catch(err =>
    logger.error('Admin evening trigger failed', { error: err.message })
  );
});

// POST /admin/trigger/weekly — manually trigger weekly review
router.post('/trigger/weekly', async (req, res) => {
  res.json({ status: 'triggered' });
  await sendWeeklyReviews().catch(err =>
    logger.error('Admin weekly trigger failed', { error: err.message })
  );
});

module.exports = router;
