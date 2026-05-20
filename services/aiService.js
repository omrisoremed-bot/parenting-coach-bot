'use strict';

const fs   = require('fs');
const path = require('path');

// Plafond de la base de connaissances injectée dans le system prompt.
// Le prompt complet (SOUL + KB) doit rester compatible avec les limites de
// débit des fournisseurs gratuits — Groq plafonne à 12 000 tokens/minute.
// 20 000 caractères ≈ 5 000 tokens : SOUL (~1,5K) + KB (~5K) + historique +
// réponse tient confortablement sous la limite.
const MAX_KNOWLEDGE_CHARS = 20000;

/**
 * Load knowledge from the knowledge/ directory (curated .md files only).
 *
 * Le cache PDF (.pdf-cache.md, ~130K caractères) n'est PAS injecté ici : il
 * faisait exploser le system prompt à ~45K tokens, ce qui dépassait les
 * limites de débit des fournisseurs IA gratuits (erreur 413 sur Groq) et
 * cassait chaque appel. Les PDFs restent disponibles pour les scripts de
 * génération d'articles via `npm run knowledge:build`.
 *
 * @param {number} maxChars - plafond de caractères (défaut MAX_KNOWLEDGE_CHARS)
 */
function loadKnowledgeBase(maxChars = MAX_KNOWLEDGE_CHARS) {
  const knowledgeDir = path.join(__dirname, '..', 'knowledge');
  if (!fs.existsSync(knowledgeDir)) return '';

  const mdFiles = fs.readdirSync(knowledgeDir)
    .filter(f => f.endsWith('.md') && f !== 'LIRE_MOI.md' && f !== '.pdf-cache.md')
    .sort();

  const sections = mdFiles.map(f => {
    const content = fs.readFileSync(path.join(knowledgeDir, f), 'utf8');
    return `### ${f.replace('.md', '')}\n${content}`;
  });

  if (!sections.length) return '';

  let kb = `\n\n## BASE DE CONNAISSANCES SPÉCIALISÉE\n${sections.join('\n\n---\n\n')}`;
  if (kb.length > maxChars) {
    kb = kb.slice(0, maxChars) + '\n\n[...base de connaissances tronquée...]';
  }
  return kb;
}

/**
 * AI Service — chaîne de providers gratuits OpenAI-compatible
 *
 * Provider principal : NVIDIA NIM (AI_API_KEY, AI_BASE_URL, AI_MODEL)
 * Fallbacks auto    : Groq (GROQ_AI_KEY) → OpenRouter (OPENROUTER_API_KEY)
 *
 * Si le principal est rate-limited ou hors-service, on bascule au suivant.
 * Pose simplement les clés de fallback dans Railway — aucun autre changement.
 */

const OpenAI = require('openai');
const logger = require('./logger');

// NVIDIA NIM defaults — llama-3.3-70b = modèle gratuit stable, bon en français
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL    = 'meta/llama-3.3-70b-instruct';

const MAX_TOKENS   = 1024;
const MAX_HISTORY  = 10;  // keep last N turns to avoid token bloat
const MAX_RETRIES  = 3;
const RETRY_DELAY  = 1500; // ms base delay (doubles each attempt)

// ─── Chaîne de fallback IA ────────────────────────────────────────────────────
// Si le provider principal (NVIDIA NIM via AI_API_KEY) tombe (quota épuisé,
// rate limit, panne), on bascule automatiquement vers Groq puis OpenRouter.
// Il suffit de poser les clés correspondantes dans Railway pour activer chaque
// fallback. Un provider sans clé est simplement ignoré.
//
// Pour ajouter un nouveau fallback : créer un compte, copier la clé, ajouter
// une entrée ci-dessous. Aucune autre modification nécessaire.
function buildProviderChain() {
  const chain = [
    {
      name:    'nvidia',
      key:     process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
      model:   process.env.AI_MODEL    || DEFAULT_MODEL
    },
    {
      name:    'groq',
      key:     process.env.GROQ_AI_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      model:   'llama-3.3-70b-versatile'
    },
    {
      name:    'openrouter',
      key:     process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      model:   process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'
    }
  ];
  return chain.filter(p => p.key);
}

// Cache des clients OpenAI par provider (un par baseURL pour éviter de
// recréer une connexion HTTP à chaque appel)
const _clientCache = new Map();

function getClientFor(provider) {
  if (!_clientCache.has(provider.name)) {
    _clientCache.set(provider.name, new OpenAI({
      apiKey:  provider.key,
      baseURL: provider.baseURL
    }));
  }
  return _clientCache.get(provider.name);
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable (rate-limit, timeout, transient server errors).
 */
function isRetryable(err) {
  const status = err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 502 || status === 504) return true;
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('econnreset') || msg.includes('network');
}

/**
 * Call the AI with a system prompt, optional conversation history, and a user message.
 * Uses OpenAI Chat Completions format — compatible with NVIDIA NIM, Groq, OpenRouter, etc.
 * Retries up to MAX_RETRIES times with exponential backoff on transient errors.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Array<{role: string, content: string}>} history
 * @returns {Promise<string>}
 */
async function callAI(systemPrompt, userMessage, history = []) {
  const providers = buildProviderChain();
  if (providers.length === 0) {
    throw new Error('Aucun provider IA configuré — set AI_API_KEY, GROQ_AI_KEY ou OPENROUTER_API_KEY');
  }

  // Trim history to avoid hitting token limits
  const trimmedHistory = history.slice(-MAX_HISTORY);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user',   content: userMessage }
  ];

  let lastErr;

  // ── Boucle sur les providers de la chaîne ──────────────────────────────────
  // Pour chaque provider : MAX_RETRIES tentatives avec backoff exponentiel sur
  // les erreurs transitoires (429/5xx/timeout). Si toutes échouent, on passe
  // au provider suivant.
  for (const provider of providers) {
    const client = getClientFor(provider);

    logger.debug('AI call', {
      provider: provider.name,
      model:    provider.model,
      historyLen: trimmedHistory.length
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model:        provider.model,
          messages,
          max_tokens:   MAX_TOKENS,
          temperature:  0.7,
          top_p:        0.95
        });

        const raw = response.choices[0]?.message?.content || '';
        const text = stripReflection(raw);
        logger.debug('AI response', {
          provider:   provider.name,
          rawChars:   raw.length,
          chars:      text.length,
          stopReason: response.choices[0]?.finish_reason,
          attempt
        });

        return text;

      } catch (err) {
        lastErr = err;
        if (isRetryable(err) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // 1.5s, 3s, 6s
          logger.warn(`AI call retry`, {
            provider: provider.name,
            attempt,
            delayMs: delay,
            error:   err.message,
            status:  err?.status
          });
          await sleep(delay);
        } else {
          // Non-retryable ou dernière tentative → bascule au provider suivant
          logger.warn(`AI provider exhausted, trying next`, {
            provider: provider.name,
            error:    err.message,
            status:   err?.status
          });
          break;
        }
      }
    }
  }

  logger.error('All AI providers failed', { error: lastErr?.message });
  throw lastErr;
}

// ─── Helpers : narration profil + stripping de la réflexion ─────────────────

/**
 * Transforme le profil structuré en 1 paragraphe narratif que le LLM
 * "lit" beaucoup mieux qu'un blob JSON. Le JSON pousse le modèle à un
 * ton de rapport ; la prose porte le ton qu'on veut transposer.
 */
function narrateProfile(user) {
  if (!user) return 'profil inconnu';
  const parts = [];
  const name = user.parent?.name || 'le parent';

  const familyMap = {
    'married':        ', en couple',
    'single-parent':  ', parent solo',
    'co-parenting':   ', en coparentalité',
    'blended-family': ', en famille recomposée'
  };
  parts.push(name + (familyMap[user.parent?.family_structure] || ''));

  const kids = (user.children || []).map(c => {
    const m = c.age_months || 0;
    const y = Math.floor(m / 12);
    const r = m % 12;
    const ageStr = y > 0
      ? (r > 0 ? `${y} ans et ${r} mois` : `${y} ans`)
      : `${m} mois`;
    const bits = [`${c.name || "l'enfant"} (${ageStr})`];
    if (c.personality && c.personality.trim()) bits.push(`tempérament ${c.personality}`);
    const sn = (c.special_needs || '').toLowerCase();
    if (sn && sn !== 'none' && sn !== 'aucun' && sn !== 'no') bits.push(c.special_needs);
    return bits.join(', ');
  });
  if (kids.length) parts.push((kids.length > 1 ? 'enfants' : 'enfant') + ' : ' + kids.join(' et '));

  const ch = (user.challenges || []).filter(Boolean);
  if (ch.length) parts.push('défis actuels : ' + ch.join(', '));
  if (user.parenting_style)  parts.push('style parental : ' + user.parenting_style);
  if (user.cultural_context) parts.push('contexte : ' + user.cultural_context);

  return parts.join('. ') + '.';
}

/**
 * Retire le bloc <reflection>...</reflection> de la réponse IA.
 * Le modèle est invité à raisonner dans ce bloc avant de produire le
 * message visible (pattern Chain-of-Thought empathique). On le strip
 * côté serveur pour que le parent ne le voie jamais.
 */
function stripReflection(text) {
  if (!text) return '';
  return text
    .replace(/<reflection>[\s\S]*?<\/reflection>\s*/gi, '')
    .trim();
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Morning plan (08:00 cron).
 */
function buildMorningPrompt(user) {
  const profile = narrateProfile(user);
  const locale = (user.language || 'fr') === 'fr' ? 'fr-FR' : 'en-US';
  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return `
Parent : ${profile}
Date : ${today}

Génère le plan du matin selon le format exact de SOUL.md — UN MOT POUR TOI en tête, puis les 4 champs.
Le champ UN MOT POUR TOI doit être nominatif (utilise son prénom) et personnel. Jamais générique.
Adapte l'activité et l'astuce à l'âge exact, au tempérament et aux défis déclarés.
Reproduis l'énergie de l'Exemple 1 de SOUL.md (pas les mots exacts).
N'oublie pas le bloc <reflection>...</reflection> avant le message visible.
Langue : ${user.language || 'fr'}. Max 160 mots visible. Astérisques *gras* WhatsApp uniquement.
  `.trim();
}

/**
 * Evening check-in (21:00 cron).
 */
function buildEveningPrompt(user) {
  const profile = narrateProfile(user);
  return `
Parent : ${profile}

Génère le bilan du soir selon le format SOUL.md : une phrase d'ouverture chaude qui
nomme le prénom du parent et celui de l'enfant, puis les 4 questions numérotées.
La phrase d'ouverture ne doit JAMAIS être générique — elle reprend le contexte.
Reproduis l'énergie de l'Exemple 2 de SOUL.md.
N'oublie pas le bloc <reflection>...</reflection> avant le message visible.
Langue : ${user.language || 'fr'}. Max 80 mots visible.
  `.trim();
}

/**
 * Weekly review (Sunday 19:00 cron).
 */
function buildWeeklyPrompt(user) {
  const profile = narrateProfile(user);
  const recent = (user.weekly_checkins || []).slice(-3);
  const recentNarr = recent.length
    ? '\nDerniers bilans du soir : ' + recent.map(c => `${(c.date || '').slice(0, 10)} « ${c.response} »`).join(' · ')
    : '';
  return `
Parent : ${profile}${recentNarr}

Génère le bilan hebdomadaire selon le format SOUL.md.
Phrase d'ouverture qui célèbre la persévérance du parent (nominative, spécifique).
Inclus 2-3 axes pour la semaine à venir, formulés en propositions douces, pas en injonctions.
N'oublie pas le bloc <reflection>...</reflection> avant le message visible.
Langue : ${user.language || 'fr'}. Max 200 mots visible.
  `.trim();
}

/**
 * Free-form parent conversation.
 */
function buildConversationPrompt(user, parentMessage) {
  const profile = narrateProfile(user);
  return `
Parent : ${profile}

Message reçu : « ${parentMessage} »

Réponds selon le ton et les exemples de SOUL.md — surtout l'Exemple 3.
Commence par nommer ce que le parent vit (1 phrase, nominative).
Reconnais l'émotion. Donne 3 conseils maximum, concrets et adaptés au profil.
Termine par une question ouverte (pas une question fermée).
N'oublie pas le bloc <reflection>...</reflection> avant le message visible.
Langue : ${user.language || 'fr'}. Max 160 mots visible. Pas de markdown complexe.
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
