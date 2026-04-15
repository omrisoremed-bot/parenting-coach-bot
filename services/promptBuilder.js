'use strict';

/**
 * promptBuilder.js — Singleton du system prompt global
 *
 * Charge SOUL.md + la base de connaissances (MD + PDF cache) une seule fois
 * au démarrage du process. Node.js met ce module en cache — tous les modules
 * qui le requirent partagent la même instance en mémoire.
 *
 * AVANT : SOUL.md + loadKnowledgeBase() lus 4x indépendamment
 *   (messageHandler, morningPlan, eveningCheckin, weeklyReview)
 * APRÈS : 1 seul require → 0 I/O disque supplémentaire
 */

const fs   = require('fs');
const path = require('path');
const { loadKnowledgeBase } = require('./aiService');

const soulPath = path.join(__dirname, '..', 'agents', 'SOUL.md');
const soul     = fs.readFileSync(soulPath, 'utf8');

const systemPrompt = soul + loadKnowledgeBase();

module.exports = { systemPrompt };
