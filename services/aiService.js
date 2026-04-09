'use strict';

/**
 * AI Service — powered by NVIDIA NIM (free tier)
 * API: https://integrate.api.nvidia.com/v1  (OpenAI-compatible)
 * Model: mistralai/mistral-large-2-instruct  (best free model for French + reasoning)
 *
 * Switching to another OpenAI-compatible free provider = change 2 env vars:
 *   Groq   → AI_BASE_URL=https://api.groq.com/openai/v1  AI_MODEL=llama-3.3-70b-versatile
 *   OpenRouter → AI_BASE_URL=https://openrouter.ai/api/v1  AI_MODEL=mistralai/mistral-7b-instruct:free
 *   Together → AI_BASE_URL=https://api.together.xyz/v1   AI_MODEL=mistralai/Mixtral-8x7B-Instruct-v0.1
 */

const OpenAI = require('openai');
const logger = require('./logger');

// NVIDIA NIM defaults
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL    = 'meta/llama-3.1-8b-instruct';

const MAX_TOKENS  = 1024;
const MAX_HISTORY = 10; // keep last N turns to avoid token bloat

let _client = null;

function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey:  process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL || DEFAULT_BASE_URL
    });
  }
  return _client;
}

function getModel() {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

/**
 * Call the AI with a system prompt, optional conversation history, and a user message.
 * Uses OpenAI Chat Completions format — compatible with NVIDIA NIM, Groq, OpenRouter, etc.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Array<{role: string, content: string}>} history
 * @returns {Promise<string>}
 */
async function callAI(systemPrompt, userMessage, history = []) {
  const client = getClient();
  const model  = getModel();

  // Trim history to avoid hitting token limits
  const trimmedHistory = history.slice(-MAX_HISTORY);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user',   content: userMessage }
  ];

  logger.debug('AI call', {
    provider: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
    model,
    historyLen: trimmedHistory.length
  });

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens:   MAX_TOKENS,
    temperature:  0.7,
    top_p:        0.95
  });

  const text = response.choices[0]?.message?.content || '';
  logger.debug('AI response', {
    chars:      text.length,
    stopReason: response.choices[0]?.finish_reason
  });

  return text;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Morning plan (08:00 cron).
 */
function buildMorningPrompt(user) {
  return `
Lis ce profil utilisateur : ${JSON.stringify(user, null, 2)}

Génère le plan parental du matin selon le format exact décrit dans SOUL.md.
Adapte l'activité et l'astuce à l'âge exact de l'enfant et aux défis déclarés.
Max 160 mots. Langue : ${user.language || 'fr'}.
Utilise uniquement le gras WhatsApp (*texte*) pour les titres.
N'utilise pas de ## ou # (markdown non rendu sur WhatsApp).
  `.trim();
}

/**
 * Evening check-in (21:00 cron).
 */
function buildEveningPrompt(user) {
  return `
Lis ce profil utilisateur : ${JSON.stringify(user, null, 2)}

Génère le message de bilan du soir selon le format dans SOUL.md.
Sois chaleureux, bref. Max 80 mots. Langue : ${user.language || 'fr'}.
Termine avec les 4 questions numérotées du format.
  `.trim();
}

/**
 * Weekly review (Sunday 19:00 cron).
 */
function buildWeeklyPrompt(user) {
  return `
Lis ce profil utilisateur : ${JSON.stringify(user, null, 2)}

Génère le bilan hebdomadaire selon le format dans SOUL.md.
Inclus 2-3 axes de focus pour la semaine à venir basés sur les défis déclarés.
Max 200 mots. Langue : ${user.language || 'fr'}.
  `.trim();
}

/**
 * Free-form parent conversation.
 */
function buildConversationPrompt(user, parentMessage) {
  return `
Lis ce profil utilisateur : ${JSON.stringify(user, null, 2)}

Le parent t'envoie ce message : "${parentMessage}"

Réponds en tant que coach parental. Applique toutes les règles de SOUL.md :
- Reconnais l'émotion d'abord si présente
- Donne des conseils pratiques adaptés à l'âge de l'enfant et au contexte
- Max 160 mots
- Langue : ${user.language || 'fr'}
- Pas de markdown complexe (WhatsApp)
  `.trim();
}

module.exports = {
  callAI,
  buildMorningPrompt,
  buildEveningPrompt,
  buildWeeklyPrompt,
  buildConversationPrompt
};
