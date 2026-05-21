'use strict';

/**
 * promptBuilder.js — Singleton du system prompt conversationnel
 *
 * Le system prompt du coach = UNIQUEMENT SOUL.md.
 *
 * La base de connaissances (~20K caractères d'articles) n'est PLUS injectée
 * ici : noyée dans le prompt, elle poussait le modèle vers un ton explicatif
 * et générique (le coach « récitait » des articles au lieu de parler). SOUL.md
 * porte déjà la voix, la méthodologie et les protocoles — c'est ce qui doit
 * dominer à 100%. La base reste disponible pour les scripts de génération
 * d'articles via `loadKnowledgeBase()` dans aiService.
 *
 * Bonus : prompt 3,5× plus court → largement sous les limites de débit des
 * fournisseurs IA gratuits (fini les échecs en cascade).
 */

const fs   = require('fs');
const path = require('path');

const soulPath = path.join(__dirname, '..', 'agents', 'SOUL.md');
const systemPrompt = fs.readFileSync(soulPath, 'utf8');

module.exports = { systemPrompt };
