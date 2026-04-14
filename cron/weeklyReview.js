'use strict';

const cron = require('node-cron');
const { getAllActiveUsers, updateProfile } = require('../handlers/profileLoader');
const { sendMessage, sleep } = require('../services/messengerAdapter');
const { callAI, buildWeeklyPrompt, loadKnowledgeBase } = require('../services/aiService');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

const soul = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');
const systemPrompt = soul + loadKnowledgeBase();

async function sendWeeklyReviews() {
  logger.info('Weekly review cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending weekly reviews to ${users.length} users`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const prompt = buildWeeklyPrompt(user);
      const message = await callAI(systemPrompt, prompt);
      await sendMessage(user.phone, message);

      // Log the weekly review date
      const checkins = user.weekly_checkins || [];
      checkins.push({
        type: 'weekly_review_sent',
        date: new Date().toISOString()
      });
      await updateProfile(user.phone, { weekly_checkins: checkins.slice(-30) });

      successCount++;
    } catch (err) {
      errorCount++;
      logger.error('Weekly review send failed', { phone: user.phone, error: err.message });
    }

    await sleep(500);
  }

  logger.info('Weekly review cron completed', { successCount, errorCount });
}

// Sunday at 19:00
function scheduleWeeklyReview() {
  return cron.schedule('0 19 * * 0', sendWeeklyReviews, {
    timezone: process.env.TIMEZONE || 'Africa/Casablanca'
  });
}

module.exports = { scheduleWeeklyReview, sendWeeklyReviews };
