'use strict';

/**
 * telegramService.js — Wrapper grammY pour Telegram Bot API
 *
 * API publique identique à whatsappService pour permettre un swap via messengerAdapter.
 * Utilise plain text (pas de Markdown) pour éviter les problèmes avec les `*bold*` style WhatsApp.
 */

const logger = require('./logger');

let _bot = null;

function getBot() {
  if (_bot) return _bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const { Bot } = require('grammy');
  _bot = new Bot(token);
  logger.info('Telegram bot initialized');
  return _bot;
}

// ─── Retry wrapper ───────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      const status = err.error_code || err.response?.status;

      // Don't retry on 4xx (bad request / auth errors)
      if (status && status >= 400 && status < 500) throw err;

      logger.warn(`Telegram send attempt ${attempt} failed`, {
        error: err.message,
        status,
        willRetry: !isLast
      });

      if (isLast) throw err;
      await sleep(delayMs * attempt);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a free-form text message to a Telegram chat.
 * chatId is the raw numeric/string Telegram chat_id (no "tg:" prefix).
 * Auto-splits messages that exceed 4000 chars (Telegram limit = 4096).
 */
async function sendMessage(chatId, text) {
  const MAX = 4000;
  const chunks = splitMessage(text, MAX);
  const bot = getBot();

  for (const chunk of chunks) {
    await withRetry(() => bot.api.sendMessage(chatId, chunk));
    if (chunks.length > 1) await sleep(300);
  }

  logger.info('Message sent via Telegram', { chatId, chars: text.length });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end);
      if (nl > start) end = nl + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { sendMessage, getBot, sleep };
