'use strict';

const cron = require('node-cron');
const { getAllActiveUsers } = require('../handlers/profileLoader');
const { sendMessage, sleep } = require('../services/whatsappService');
const { callAI, buildEveningPrompt, loadKnowledgeBase } = require('../services/aiService');
const { setState } = require('../services/sessionManager');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

const soul = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');
const systemPrompt = soul + loadKnowledgeBase();

async function sendEveningCheckins() {
  logger.info('Evening check-in cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending evening check-ins to ${users.length} users`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const prompt = buildEveningPrompt(user);
      const message = await callAI(systemPrompt, prompt);
      await sendMessage(user.phone, message);

      // Set session state so the next message is treated as a check-in response
      setState(user.phone, { step: 'awaiting_checkin_response' });

      successCount++;
    } catch (err) {
      errorCount++;
      logger.error('Evening check-in send failed', { phone: user.phone, error: err.message });
    }

    await sleep(500);
  }

  logger.info('Evening check-in cron completed', { successCount, errorCount });
}

// 21:00 every day
function scheduleEveningCheckin() {
  return cron.schedule('0 21 * * *', sendEveningCheckins, {
    timezone: process.env.TIMEZONE || 'Africa/Casablanca'
  });
}

module.exports = { scheduleEveningCheckin, sendEveningCheckins };
