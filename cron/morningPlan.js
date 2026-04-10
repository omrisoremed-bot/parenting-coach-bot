'use strict';

const cron = require('node-cron');
const { getAllActiveUsers } = require('../handlers/profileLoader');
const { sendMessage, sendTemplate, sleep } = require('../services/whatsappService');
const { callAI, buildMorningPrompt, loadKnowledgeBase } = require('../services/aiService');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

const soul = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');
const systemPrompt = soul + loadKnowledgeBase();

async function sendMorningPlans() {
  logger.info('Morning plan cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending morning plans to ${users.length} users`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const prompt = buildMorningPrompt(user);
      const message = await callAI(systemPrompt, prompt);
      await sendMessage(user.phone, message);
      successCount++;
    } catch (err) {
      errorCount++;
      logger.error('Morning plan send failed', { phone: user.phone, error: err.message });
    }

    // Throttle: 500ms between users to respect API rate limits
    await sleep(500);
  }

  logger.info('Morning plan cron completed', { successCount, errorCount });
}

// 08:00 AM every day — Africa/Casablanca timezone
function scheduleMorningPlan() {
  return cron.schedule('0 8 * * *', sendMorningPlans, {
    timezone: process.env.TIMEZONE || 'Africa/Casablanca'
  });
}

module.exports = { scheduleMorningPlan, sendMorningPlans };
