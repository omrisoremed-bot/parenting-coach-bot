'use strict';

/**
 * memoryService.js — Long-term memory extraction + injection.
 *
 * Architecture :
 *   - Storage : services/vaultService.js (Obsidian markdown vault)
 *   - Extraction : LLM call (gpt-4o-mini cheap) after each substantial turn
 *     extracts 0-3 durable facts, appended to memories.md
 *   - Injection : on every conversation, prepend the user's memories.md
 *     snippet (capped at ~1500 chars) to the system prompt
 *
 * Why this matters :
 *   - Without memory, the bot forgets "Yassine has peur du noir" between sessions
 *   - The 6-message history window is too short for long-term context
 *   - Markdown vault is human-readable + Obsidian-syncable for power users
 */

const vault   = require('./vaultService');
const { callAI } = require('./aiService');
const logger  = require('./logger');

const MAX_MEMORY_CHARS_IN_PROMPT = 1500;
const MIN_USER_TEXT_FOR_EXTRACT  = 60;   // skip if user said <60 chars (e.g. "ok", "merci")

// ─── Memory injection (called by messageHandler before LLM call) ────────────
/**
 * Returns a formatted memory block to inject into the system prompt.
 * Returns empty string if no memories exist for the user.
 */
function getMemoryContext(phone) {
  try {
    const memories = vault.readMemories(phone, 50);
    if (!memories.trim()) return '';

    let trimmed = memories;
    if (trimmed.length > MAX_MEMORY_CHARS_IN_PROMPT) {
      // Keep the most recent entries (end of file)
      trimmed = trimmed.slice(-MAX_MEMORY_CHARS_IN_PROMPT);
    }

    return `\n\n## MÉMOIRE DURABLE (faits déjà partagés par ce parent)
${trimmed}

Utilise ces informations pour personnaliser ta réponse SANS les répéter explicitement, sauf si pertinent.
`;
  } catch (err) {
    logger.warn('getMemoryContext failed', { phone, error: err.message });
    return '';
  }
}

// ─── Memory extraction (fire-and-forget after each turn) ────────────────────
const EXTRACT_SYSTEM = `Tu es un assistant qui extrait UNIQUEMENT les faits durables sur l'enfant et la famille à partir d'un échange.

Règles strictes :
- Extraits UNIQUEMENT des faits qui restent vrais sur des semaines/mois (prénom enfant, âge, peurs récurrentes, contexte familial, conditions médicales, allergies, prénoms famille…).
- IGNORE l'humeur du moment, les anecdotes ponctuelles, les remerciements, les questions du parent.
- Format de sortie OBLIGATOIRE : 0 à 3 lignes, une ligne = un fait. Pas de markdown, pas de phrase d'intro, pas d'explication.
- Maximum 100 caractères par ligne.
- Si rien à extraire, réponds exactement : NONE

Exemples bons :
Yassine, 3 ans, refuse le coucher depuis 2 semaines
Lina a peur du noir depuis le déménagement
Maman travaille de nuit le mercredi

Exemples mauvais (à ne PAS extraire) :
"Le parent semble fatigué" (humeur du moment)
"Bonne journée aujourd'hui" (anecdote)
"Merci pour ton conseil" (politesse)
`;

/**
 * Asynchronously extract memories from a user turn + assistant reply.
 * Fire-and-forget : caller does NOT await this.
 */
async function extractAndStoreMemory(phone, userText, assistantText) {
  try {
    if (!userText || userText.length < MIN_USER_TEXT_FOR_EXTRACT) return;

    const userPrompt = `Échange entre un parent et son coach :

PARENT : """${userText.slice(0, 1200)}"""

COACH : """${(assistantText || '').slice(0, 800)}"""

Extraits les faits durables (0-3 lignes max, ou "NONE" si rien).`;

    const response = await callAI(EXTRACT_SYSTEM, userPrompt, []);
    const lines = String(response || '')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && s !== 'NONE' && !s.toLowerCase().startsWith('voici') && s.length > 5 && s.length <= 150)
      .slice(0, 3);

    for (const fact of lines) {
      vault.appendMemory(phone, fact);
    }

    if (lines.length > 0) {
      logger.info('memory extracted', { phone, count: lines.length });
    }
  } catch (err) {
    logger.warn('memory extraction failed', { phone, error: err.message });
  }
}

// ─── Profile sync (called whenever profile is updated) ──────────────────────
function syncProfileToVault(phone, profile) {
  try {
    vault.writeProfile(phone, profile);
  } catch (err) {
    logger.warn('syncProfileToVault failed', { phone, error: err.message });
  }
}

module.exports = {
  getMemoryContext,
  extractAndStoreMemory,
  syncProfileToVault,
};
