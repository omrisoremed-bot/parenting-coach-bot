'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Load all .md files from the knowledge/ directory.
 * Returns a combined string injected into the system prompt.
 */
function loadKnowledgeBase() {
  const knowledgeDir = path.join(__dirname, '..', 'knowledge');
  if (!fs.existsSync(knowledgeDir)) return '';
  const files = fs.readdirSync(knowledgeDir)
    .filter(f => f.endsWith('.md') && f !== 'LIRE_MOI.md');
  if (!files.length) return '';
  const contents = files.map(f => {
    const content = fs.readFileSync(path.join(knowledgeDir, f), 'utf8');
    return `### ${f.replace('.md', '')}\n${content}`;
  }).join('\n\n---\n\n');
  return `\n\n## BASE DE CONNAISSANCES SPÉCIALISÉE\n${contents}`;
}

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

// NVIDIA NIM defaults — mistral-large = meilleur modèle gratuit pour le français + raisonnement
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL    = 'mistralai/mistral-large-2-instruct';

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
  const religion = user.cultural_context || '';
  const religionLine = religion ? `\nContexte culturel/religieux : "${religion}" → respecte ces valeurs.` : '';
  return `
PROFIL : ${JSON.stringify({ parent: user.parent, children: user.children, challenges: user.challenges, family_structure: user.family_structure, child_personality: user.child_personality, child_special_needs: user.child_special_needs }, null, 2)}${religionLine}

Génère le plan parental du matin selon le format exact de SOUL.md.
Adapte l'activité et l'astuce à l'âge exact de l'enfant et aux défis déclarés.
Max 160 mots. Langue : ${user.language || 'fr'}.
Utilise *texte* pour le gras WhatsApp. Pas de ## ou #.
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
  const religion = user.cultural_context || user.culturalContext || '';
  const religionLine = religion
    ? `\nCONTEXTE RELIGIEUX/CULTUREL : "${religion}" → Respecte ABSOLUMENT ces valeurs dans chaque conseil.`
    : '';

  return `
PROFIL PARENT :
- Prénom : ${user.parent?.name || 'inconnu'}
- Enfant : ${(user.children || []).map(c => `${c.name || '?'}, ${c.age || '?'}`).join(', ') || 'non renseigné'}
- Défis : ${(user.challenges || []).join(', ') || 'non renseignés'}
- Structure familiale : ${user.family_structure || 'non renseignée'}
- Personnalité enfant : ${user.child_personality || 'non renseignée'}
- Besoins spéciaux : ${user.child_special_needs || 'aucun'}${religionLine}

MESSAGE DU PARENT : "${parentMessage}"

INSTRUCTIONS DE RÉPONSE :
1. Commence TOUJOURS par reformuler la problématique en 1 phrase : "Je comprends que [reformulation courte]..."
2. Reconnais l'émotion si présente (1 phrase max)
3. Donne 2-3 conseils pratiques concrets adaptés au profil
4. Termine par une phrase d'encouragement courte

Règles : Max 160 mots. Langue : ${user.language || 'fr'}. Pas de #/## ni markdown complexe.
  `.trim();
}

module.exports = {
  callAI,
  loadKnowledgeBase,
  buildMorningPrompt,
  buildEveningPrompt,
  buildWeeklyPrompt,
  buildConversationPrompt
};
