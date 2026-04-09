'use strict';

const axios = require('axios');
const logger = require('./logger');

// Lazy-init Twilio client only when needed
let _twilioClient = null;
function getTwilioClient() {
  if (!_twilioClient) {
    const twilio = require('twilio');
    _twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return _twilioClient;
}

// ─── Meta Cloud API sender ───────────────────────────────────────────────────
async function sendViaMeta(to, text) {
  const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  logger.info('Message sent via Meta', { to, chars: text.length });
}

// ─── Meta Template sender (for cron messages after 24h window) ───────────────
async function sendTemplateViaMeta(to, templateName, components = []) {
  const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'fr' },
        components
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  logger.info('Template sent via Meta', { to, templateName });
}

// ─── Twilio sender ───────────────────────────────────────────────────────────
async function sendViaTwilio(to, text) {
  const client = getTwilioClient();
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body: text
  });
  logger.info('Message sent via Twilio', { to, chars: text.length });
}

// ─── Retry wrapper ───────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      const status = err.response?.status;

      // Don't retry on 4xx (bad request / auth errors)
      if (status && status >= 400 && status < 500) throw err;

      logger.warn(`Send attempt ${attempt} failed`, {
        error: err.message,
        status,
        willRetry: !isLast
      });

      if (isLast) throw err;
      await sleep(delayMs * attempt); // exponential back-off
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a free-form text message.
 * Automatically splits messages that exceed WhatsApp's 4096-char limit.
 */
async function sendMessage(to, text) {
  const MAX = 4000; // stay safely under 4096
  const chunks = splitMessage(text, MAX);

  for (const chunk of chunks) {
    await withRetry(() => {
      if (process.env.PROVIDER === 'twilio') {
        return sendViaTwilio(to, chunk);
      }
      return sendViaMeta(to, chunk);
    });
    if (chunks.length > 1) await sleep(300); // brief pause between chunks
  }
}

/**
 * Send a Meta-approved template message.
 * Falls back to free-form for Twilio (sandbox has no templates).
 */
async function sendTemplate(to, templateName, components = []) {
  if (process.env.PROVIDER === 'twilio') {
    // Twilio sandbox — templates not required, send free-form
    logger.info('Twilio mode: skipping template, send free-form instead', { to });
    return;
  }
  await withRetry(() => sendTemplateViaMeta(to, templateName, components));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      // Try to split on a newline boundary
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

module.exports = { sendMessage, sendTemplate, sleep };
