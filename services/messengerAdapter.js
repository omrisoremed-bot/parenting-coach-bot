'use strict';

/**
 * messengerAdapter.js — Couche d'abstraction multi-canal (WhatsApp / Telegram)
 *
 * Conventions d'ID utilisateur (stocké en PK `phone` dans la DB) :
 *   - WhatsApp : "+212XXXXXXXXX" (format E.164, pas de préfixe)
 *   - Telegram : "tg:<chat_id>" (préfixe `tg:` + chat_id numérique)
 *
 * Cette convention évite toute migration de schéma — le même code backend
 * (handlers, cron, profileLoader) traite l'ID comme une chaîne opaque.
 */

const whatsappService = require('./whatsappService');
const telegramService = require('./telegramService');

const TG_PREFIX = 'tg:';

function detectProvider(userId) {
  if (typeof userId !== 'string') return 'whatsapp';
  return userId.startsWith(TG_PREFIX) ? 'telegram' : 'whatsapp';
}

/**
 * Send a free-form text message to a user, routing by ID prefix.
 */
async function sendMessage(userId, text) {
  if (detectProvider(userId) === 'telegram') {
    const chatId = userId.slice(TG_PREFIX.length);
    return telegramService.sendMessage(chatId, text);
  }
  return whatsappService.sendMessage(userId, text);
}

/**
 * Send a template message (WhatsApp only — no-op for Telegram).
 * Telegram has no 24h window restriction, so cron messages just use sendMessage.
 */
async function sendTemplate(userId, templateName, components = []) {
  if (detectProvider(userId) === 'telegram') {
    return; // no templates on Telegram
  }
  return whatsappService.sendTemplate(userId, templateName, components);
}

/**
 * Encode a raw Telegram chat_id into the internal user ID format.
 */
function encodeTelegramUserId(chatId) {
  return `${TG_PREFIX}${chatId}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendMessage,
  sendTemplate,
  detectProvider,
  encodeTelegramUserId,
  sleep,
  TG_PREFIX
};
