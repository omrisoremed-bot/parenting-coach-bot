'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const logger = require('./services/logger');
const messageHandler = require('./handlers/messageHandler');
const { initCronJobs } = require('./cron');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Track processed message IDs to deduplicate Meta webhooks ───────────────
const processedIds = new Set();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(messageId) {
  if (processedIds.has(messageId)) return true;
  processedIds.add(messageId);
  // Auto-clean after TTL to avoid unbounded memory growth
  setTimeout(() => processedIds.delete(messageId), DEDUP_TTL_MS);
  return false;
}

// ─── GET /webhook — Meta verification handshake ─────────────────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    logger.info('Webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  logger.warn('Webhook verification failed', { mode, token });
  return res.sendStatus(403);
});

// ─── POST /webhook — Incoming messages ──────────────────────────────────────
app.post('/webhook', (req, res) => {
  // Acknowledge immediately — Meta requires response within 5s
  res.sendStatus(200);

  try {
    const provider = process.env.PROVIDER || 'meta';

    if (provider === 'twilio') {
      handleTwilioWebhook(req.body);
    } else {
      handleMetaWebhook(req.body);
    }
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message });
  }
});

function handleMetaWebhook(body) {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) return;

  const from = message.from;
  const messageId = message.id;
  const text = message.text?.body || '';
  const type = message.type;

  // Only handle text messages
  if (type !== 'text') {
    logger.info('Non-text message ignored', { from, type });
    return;
  }

  if (isDuplicate(messageId)) {
    logger.debug('Duplicate message ignored', { messageId });
    return;
  }

  logger.info('Incoming message', { from, messageId, text: text.slice(0, 50) });
  messageHandler(from, text).catch(err =>
    logger.error('messageHandler error', { from, error: err.message })
  );
}

function handleTwilioWebhook(body) {
  const from      = (body.From || '').replace('whatsapp:', '');
  const text      = body.Body || '';
  const messageId = body.MessageSid;
  const numMedia  = parseInt(body.NumMedia || '0', 10);
  const mediaUrl  = body.MediaUrl0 || '';
  const mediaType = (body.MediaContentType0 || '').toLowerCase();

  if (!from) return;

  if (isDuplicate(messageId)) {
    logger.debug('Duplicate Twilio message ignored', { messageId });
    return;
  }

  // ── Message audio (note vocale WhatsApp) ────────────────────────────────────
  const isAudio = numMedia > 0 && (
    mediaType.includes('audio') || mediaType.includes('ogg') ||
    mediaType.includes('mp3') || mediaType.includes('mp4') ||
    mediaType.includes('mpeg') || mediaType.includes('amr')
  );

  if (isAudio && mediaUrl) {
    logger.info('Incoming audio message', { from, messageId, mediaType });
    handleAudioMessage(from, mediaUrl).catch(err =>
      logger.error('Audio handler error', { from, error: err.message })
    );
    return;
  }

  // ── Message texte normal ─────────────────────────────────────────────────────
  if (!text) return;

  logger.info('Incoming Twilio message', { from, messageId, text: text.slice(0, 50) });
  messageHandler(from, text).catch(err =>
    logger.error('messageHandler error', { from, error: err.message })
  );
}

async function handleAudioMessage(from, mediaUrl) {
  const { loadProfile } = require('./handlers/profileLoader');
  const { sendMessage } = require('./services/whatsappService');
  const { transcribeAudio } = require('./services/transcriptionService');

  if (!process.env.GROQ_API_KEY) {
    await sendMessage(from, '🎤 Les messages vocaux ne sont pas encore activés. Écris ton message en texte svp.');
    return;
  }

  try {
    const profile  = loadProfile(from);
    const userLang = profile?.language || 'fr';

    // Accusé de réception pendant la transcription
    const ackMessages = {
      fr: '🎤 Je transcris ton message vocal...',
      ar: '🎤 جاري تحويل رسالتك الصوتية...',
      darija: '🎤 كنحول صوتك لكتابة...',
      en: '🎤 Transcribing your voice message...'
    };
    await sendMessage(from, ackMessages[userLang] || ackMessages.fr);

    const transcription = await transcribeAudio(mediaUrl, userLang);

    if (!transcription) {
      const errMsg = { fr: 'Je n\'ai pas pu comprendre l\'audio. Peux-tu réécrire ?', ar: 'لم أفهم الصوت. هل يمكنك الكتابة؟', darija: 'ما فهمتش الصوت. كتب ليا من فضلك.', en: 'Could not understand the audio. Please type your message.' };
      await sendMessage(from, errMsg[userLang] || errMsg.fr);
      return;
    }

    // Affiche la transcription puis traite comme texte
    const prefix = { fr: `🎤 _J'ai compris :_ "${transcription}"`, ar: `🎤 _فهمت :_ "${transcription}"`, darija: `🎤 _فهمت :_ "${transcription}"`, en: `🎤 _I heard :_ "${transcription}"` };
    await sendMessage(from, prefix[userLang] || prefix.fr);

    const messageHandlerModule = require('./handlers/messageHandler');
    await messageHandlerModule(from, transcription);

    logger.info('Audio transcription processed', { from, chars: transcription.length });

  } catch (err) {
    logger.error('Transcription failed', { from, error: err.message });
    const { sendMessage: send } = require('./services/whatsappService');
    await send(from, '🎤 Erreur lors de la transcription. Écris ton message en texte svp.');
  }
}

// ─── Admin endpoint — view / update user profiles ───────────────────────────
const adminRouter = require('./handlers/adminHandler');
app.use('/admin', adminRouter);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── Start server + cron jobs ────────────────────────────────────────────────
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  initCronJobs();
});

module.exports = app;
