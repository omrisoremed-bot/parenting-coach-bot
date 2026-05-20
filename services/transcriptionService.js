'use strict';

/**
 * transcriptionService.js — Transcription audio WhatsApp via Groq Whisper
 *
 * Gratuit sur https://console.groq.com
 * Ajoute GROQ_API_KEY dans Railway → variables d'environnement
 *
 * Formats supportés : ogg, mp3, mp4, wav, webm, m4a (WhatsApp envoie du .ogg)
 * Langues : français, arabe, darija, anglais (auto-détection)
 */

const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const os      = require('os');
const path    = require('path');
const FormData = require('form-data');
const axios   = require('axios');
const logger  = require('./logger');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Map language code → Whisper hint (améliore la précision)
const LANG_HINTS = {
  fr: 'fr', ar: 'ar', darija: 'ar', en: 'en'
};

/**
 * Télécharge un fichier audio depuis Twilio (authentifié) et le transcrit via Groq Whisper.
 *
 * @param {string} mediaUrl   — URL Twilio du fichier audio
 * @param {string} userLang   — langue du profil ('fr', 'ar', 'darija', 'en')
 * @returns {Promise<string>} — texte transcrit
 */
async function transcribeAudio(mediaUrl, userLang = 'fr') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('GROQ_API_KEY non configuré — transcription audio désactivée');
  }

  // 1. Télécharge le fichier audio depuis Twilio
  const tempFile = path.join(os.tmpdir(), `wa_audio_${Date.now()}.ogg`);
  await downloadFile(mediaUrl, tempFile);

  try {
    // 2. Prépare le formulaire multipart pour Groq
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFile), {
      filename: 'audio.ogg',
      contentType: 'audio/ogg'
    });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'text');

    // Hint de langue pour meilleure précision
    const langHint = LANG_HINTS[userLang] || 'fr';
    form.append('language', langHint);

    // 3. Appel Groq Whisper
    const response = await axios.post(GROQ_API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${groqKey}`
      },
      timeout: 30000
    });

    const transcription = typeof response.data === 'string'
      ? response.data.trim()
      : response.data?.text?.trim() || '';

    logger.info('Audio transcribed', { chars: transcription.length, lang: langHint });
    return transcription;

  } finally {
    // Nettoyage fichier temporaire
    fs.unlink(tempFile, () => {});
  }
}

/**
 * Télécharge un fichier depuis une URL (avec auth Basic Twilio si nécessaire).
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const auth       = accountSid && authToken
      ? `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      : undefined;

    const parsedUrl  = new URL(url);
    const protocol   = parsedUrl.protocol === 'https:' ? https : http;
    const options    = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      headers:  auth ? { 'Authorization': auth } : {}
    };

    const file = fs.createWriteStream(destPath);
    protocol.get(options, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Transcrit un Buffer audio (déjà téléchargé/uploadé) via Groq Whisper.
 * Utilisé par /api/transcribe pour l'audio enregistré dans l'app mobile.
 *
 * @param {Buffer} buffer    — bytes du fichier audio
 * @param {string} mimeType  — ex. "audio/m4a", "audio/webm", "audio/ogg"
 * @param {string} userLang  — code langue ('fr', 'ar', 'darija', 'en')
 * @returns {Promise<string>}
 */
async function transcribeBuffer(buffer, mimeType = 'audio/m4a', userLang = 'fr') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('GROQ_API_KEY non configuré — transcription audio désactivée');
  }

  // Devine l'extension pour le filename multipart (Whisper s'en sert)
  const extMap = {
    'audio/m4a':  'm4a',
    'audio/mp4':  'm4a',
    'audio/mpeg': 'mp3',
    'audio/mp3':  'mp3',
    'audio/wav':  'wav',
    'audio/ogg':  'ogg',
    'audio/webm': 'webm',
    'audio/amr':  'amr'
  };
  const ext = extMap[mimeType.toLowerCase()] || 'm4a';

  const form = new FormData();
  form.append('file', buffer, {
    filename:    `audio.${ext}`,
    contentType: mimeType
  });
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'text');
  form.append('language', LANG_HINTS[userLang] || 'fr');

  const response = await axios.post(GROQ_API_URL, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${groqKey}`
    },
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength:    10 * 1024 * 1024
  });

  const transcription = typeof response.data === 'string'
    ? response.data.trim()
    : response.data?.text?.trim() || '';

  logger.info('Audio buffer transcribed', { bytes: buffer.length, chars: transcription.length, lang: userLang });
  return transcription;
}

module.exports = { transcribeAudio, transcribeBuffer };
