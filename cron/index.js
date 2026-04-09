'use strict';

const { scheduleMorningPlan } = require('./morningPlan');
const { scheduleEveningCheckin } = require('./eveningCheckin');
const { scheduleWeeklyReview } = require('./weeklyReview');
const logger = require('../services/logger');

function initCronJobs() {
  scheduleMorningPlan();
  logger.info('Cron: morning plan scheduled (08:00 daily)');

  scheduleEveningCheckin();
  logger.info('Cron: evening check-in scheduled (21:00 daily)');

  scheduleWeeklyReview();
  logger.info('Cron: weekly review scheduled (Sunday 19:00)');
}

module.exports = { initCronJobs };
