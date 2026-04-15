'use strict';

const cron = require('node-cron');
const { getAllActiveUsers } = require('../handlers/profileLoader');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI, buildEveningPrompt } = require('../services/aiService');
const { systemPrompt } = require('../services/promptBuilder');
const { setState } = require('../services/sessionManager');
const logger = require('../services/logger');

const BATCH_SIZE = 5;

/**
 * Envoie le bilan du soir à un utilisateur et positionne son état
 * en `awaiting_checkin_response` pour capter sa réponse.
 */
async function sendEveningCheckinToUser(user) {
  const prompt  = buildEveningPrompt(user);
  const message = await callAI(systemPrompt, prompt);
  await sendMessage(user.phone, message);
  setState(user.phone, { step: 'awaiting_checkin_response' });
  logger.debug('Evening check-in sent', { phone: user.phone });
}

/**
 * Envoie les bilans du soir à tous les utilisateurs actifs.
 * Traitement par batches de BATCH_SIZE en parallèle.
 */
async function sendEveningCheckins() {
  logger.info('Evening check-in cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending evening check-ins to ${users.length} users`);

  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch    = users.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.allSettled(batch.map(sendEveningCheckinToUser));

    for (const [idx, outcome] of outcomes.entries()) {
      if (outcome.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        logger.error('Evening check-in send failed', {
          phone: batch[idx].phone,
          error: outcome.reason?.message
        });
      }
    }
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
