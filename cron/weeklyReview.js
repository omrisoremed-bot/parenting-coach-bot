'use strict';

const cron = require('node-cron');
const { getAllActiveUsers, updateProfile } = require('../handlers/profileLoader');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI, buildWeeklyPrompt } = require('../services/aiService');
const { systemPrompt } = require('../services/promptBuilder');
const logger = require('../services/logger');

const BATCH_SIZE = 5;

/**
 * Envoie le bilan hebdomadaire à un utilisateur et log l'envoi
 * dans ses weekly_checkins (3 derniers gardés pour buildWeeklyPrompt).
 */
async function sendWeeklyReviewToUser(user) {
  const prompt  = buildWeeklyPrompt(user);
  const message = await callAI(systemPrompt, prompt);
  await sendMessage(user.phone, message);

  // Log la date d'envoi (séparé des réponses check-in dans le même champ)
  const checkins = user.weekly_checkins || [];
  checkins.push({ type: 'weekly_review_sent', date: new Date().toISOString() });
  await updateProfile(user.phone, { weekly_checkins: checkins.slice(-30) });

  logger.debug('Weekly review sent', { phone: user.phone });
}

/**
 * Envoie les bilans hebdomadaires à tous les utilisateurs actifs.
 * Traitement par batches de BATCH_SIZE en parallèle.
 */
async function sendWeeklyReviews() {
  logger.info('Weekly review cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending weekly reviews to ${users.length} users`);

  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch    = users.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.allSettled(batch.map(sendWeeklyReviewToUser));

    for (const [idx, outcome] of outcomes.entries()) {
      if (outcome.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        logger.error('Weekly review send failed', {
          phone: batch[idx].phone,
          error: outcome.reason?.message
        });
      }
    }
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
