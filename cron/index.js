'use strict';

const path = require('path');
const cron = require('node-cron');
const { execFile } = require('child_process');
const { scheduleMorningPlan } = require('./morningPlan');
const { scheduleEveningCheckin } = require('./eveningCheckin');
const { scheduleWeeklyReview } = require('./weeklyReview');
const logger = require('../services/logger');

const TZ = process.env.TIMEZONE || 'Africa/Casablanca';

/**
 * Run a Node script as a subprocess. Errors are logged but never thrown
 * (cron jobs must not crash the bot process).
 */
function runScript(scriptPath, label) {
  execFile(process.execPath, [scriptPath], { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
    if (err) {
      logger.error(`Cron job ${label} failed`, {
        message: err.message,
        code:    err.code,
        stderr:  stderr?.slice(0, 1000)
      });
      return;
    }
    logger.info(`Cron job ${label} OK`, { stdout: stdout?.slice(-500) });
  });
}

function initCronJobs() {
  scheduleMorningPlan();
  logger.info('Cron: morning plan scheduled (08:00 daily)');

  scheduleEveningCheckin();
  logger.info('Cron: evening check-in scheduled (21:00 daily)');

  scheduleWeeklyReview();
  logger.info('Cron: weekly review scheduled (Sunday 19:00)');

  // ─── Daily SQLite backup → Cloudflare R2 (02:00 Casablanca) ────────────────
  // Skipped silently if R2 env vars absent (e.g., dev environment)
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    cron.schedule('0 2 * * *', () => {
      runScript(path.join(__dirname, '..', 'scripts', 'backup-sqlite.js'), 'backup-sqlite');
    }, { timezone: TZ });
    logger.info('Cron: SQLite backup scheduled (02:00 daily, R2 configured)');
  } else {
    logger.info('Cron: SQLite backup SKIPPED (R2 env vars not set)');
  }

  // ─── Daily GitHub key leak scan (04:00 Casablanca) ─────────────────────────
  if (process.env.GITHUB_PAT) {
    cron.schedule('0 4 * * *', () => {
      runScript(path.join(__dirname, '..', 'scripts', 'check-key-leaks.js'), 'check-key-leaks');
    }, { timezone: TZ });
    logger.info('Cron: key leak scan scheduled (04:00 daily, GITHUB_PAT configured)');
  } else {
    logger.info('Cron: key leak scan SKIPPED (GITHUB_PAT not set)');
  }

  // ─── Daily webhook dedup cleanup (03:00 Casablanca) ────────────────────────
  // Deletes processed_message_ids rows older than 24h (in-process, no subprocess)
  cron.schedule('0 3 * * *', () => {
    try {
      const { cleanupOld } = require('../services/messageDedup');
      const deleted = cleanupOld();
      logger.info('Cron: webhook dedup cleanup done', { deleted });
    } catch (err) {
      logger.error('Cron: webhook dedup cleanup failed', { error: err.message });
    }
  }, { timezone: TZ });
  logger.info('Cron: webhook dedup cleanup scheduled (03:00 daily)');
}

module.exports = { initCronJobs };
