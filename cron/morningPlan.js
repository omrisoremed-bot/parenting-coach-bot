'use strict';

const cron = require('node-cron');
const { getAllActiveUsers } = require('../handlers/profileLoader');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI, buildMorningPrompt } = require('../services/aiService');
const { systemPrompt } = require('../services/promptBuilder');
const logger = require('../services/logger');

// ── Taille des batches parallèles ────────────────────────────────────────────
// 5 appels IA en parallèle max — équilibre vitesse vs rate-limit NVIDIA NIM
const BATCH_SIZE = 5;

/**
 * Envoie le plan du matin à un utilisateur individuel.
 * Retourne une Promise — les erreurs sont catchées au niveau batch.
 */
async function sendMorningPlanToUser(user) {
  const prompt  = buildMorningPrompt(user);
  const message = await callAI(systemPrompt, prompt);
  await sendMessage(user.phone, message);
  logger.debug('Morning plan sent', { phone: user.phone });
}

/**
 * Envoie les plans du matin à tous les utilisateurs actifs.
 * Traitement par batches de BATCH_SIZE en parallèle pour éviter
 * les délais excessifs à grande échelle (avant : 100 users = 50s+).
 */
async function sendMorningPlans() {
  logger.info('Morning plan cron started');
  const users = getAllActiveUsers();
  logger.info(`Sending morning plans to ${users.length} users`);

  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch    = users.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.allSettled(batch.map(sendMorningPlanToUser));

    for (const [idx, outcome] of outcomes.entries()) {
      if (outcome.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        logger.error('Morning plan send failed', {
          phone: batch[idx].phone,
          error: outcome.reason?.message
        });
      }
    }
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
