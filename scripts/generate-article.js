#!/usr/bin/env node
'use strict';

/**
 * generate-article.js — Générateur d'articles de blog ParentEase (Phase 3 v1)
 *
 * Usage :
 *   node scripts/generate-article.js \
 *     --topic "Comment gérer les crises du coucher chez l'enfant de 3 ans" \
 *     --keyword "crise du coucher enfant 3 ans" \
 *     --author "Dr. Amina Benali" \
 *     --lang fr
 *
 * Sortie : landing/blog/drafts/<slug>.md  (frontmatter + contenu markdown)
 *
 * Le script utilise le même provider LLM que le bot (NVIDIA NIM / Groq / Claude / ...)
 * via l'OpenAI SDK. La base de connaissances `knowledge/*.md` est injectée dans le
 * system prompt pour garantir une cohérence éditoriale avec le ton du coach.
 *
 * IMPORTANT : le script écrit dans `drafts/` pas dans `landing/blog/` — review humaine
 * obligatoire (SEO, EEAT, ton, citations) avant publication. C'est voulu.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { loadKnowledgeBase } = require('../services/aiService');

// ─── CLI args ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv);
const topic   = args.topic;
const keyword = args.keyword || topic;
const author  = args.author || 'L\'équipe ParentEase';
const lang    = args.lang || 'fr';
const model   = args.model || process.env.ARTICLE_MODEL || process.env.AI_MODEL || 'mistralai/mistral-large-2-instruct';

if (!topic) {
  console.error(`
❌ Manquant : --topic

Usage :
  node scripts/generate-article.js --topic "Titre complet" [options]

Options :
  --topic    "Sujet/titre de l'article"         (requis)
  --keyword  "mot-clé SEO principal"            (défaut = topic)
  --author   "Nom de l'auteur"                  (défaut = "L'équipe ParentEase")
  --lang     fr|en|es|pt|ar                     (défaut = fr)
  --model    modèle LLM                         (défaut = $AI_MODEL)
`);
  process.exit(1);
}

// ─── Slug helper ─────────────────────────────────────────────────────────────
function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

// ─── System prompt (éditorial ParentEase) ────────────────────────────────────
const KNOWLEDGE = loadKnowledgeBase();

const SYSTEM_PROMPT = `Tu es un·e rédacteur·rice expert·e en parentalité positive pour ParentEase, un coach parental digital. Tu écris des articles de blog longs (1400-1800 mots), chaleureux, pragmatiques et basés sur la recherche.

## Voix éditoriale ParentEase
- Ton chaleureux, empathique, sans jugement. On parle au parent comme à un·e ami·e.
- Pas de jargon. Si un terme technique apparaît, on l'explique immédiatement.
- Pragmatique : chaque section contient une action concrète que le parent peut tenter DEMAIN.
- Jamais prescriptif à l'excès : "essaie de", "tu pourrais", "certains parents trouvent utile de".
- Respect culturel : évite les exemples hyper-occidentaux par défaut. Accessible à une famille marocaine, française ou africaine francophone.

## Règles SEO / EEAT
- Mot-clé principal dans : H1, premier paragraphe, au moins 2 H2, meta description.
- Densité du mot-clé : ~1%. Variations sémantiques bienvenues.
- Longueur : 1400-1800 mots.
- Structure H2/H3 claire. Pas plus de 2 niveaux de profondeur.
- Cite des recherches réelles avec parcimonie (auteur + année, pas d'URL inventée).
- Bullet points et listes numérotées où ça aide la lisibilité.
- Une FAQ de 4-6 questions en fin d'article (schema-ready).

## Format de sortie STRICT (markdown)
Tu dois renvoyer UNIQUEMENT le contenu markdown avec ce front-matter YAML en tête :

---
title: "..."
description: "..." # 140-160 caractères, inclut le mot-clé
keyword: "..."
author: "..."
lang: "..."
date: "${new Date().toISOString().slice(0, 10)}"
reading_time: "..." # ex: "8 min"
---

# [H1 incluant le mot-clé]

[Introduction — 2 paragraphes. Accroche émotionnelle + promesse de l'article + aperçu de ce qu'on va couvrir.]

## [H2 #1]
...

## [H2 #2]
...

## [H2 #3]
...

## [H2 #4]
...

## Ce que tu peux faire dès ce soir
[Checklist de 4-6 actions concrètes, numérotées.]

## Questions fréquentes
### [Q1]
[A1 — 2-3 phrases]

### [Q2]
...

## Pour aller plus loin
[1 paragraphe de conclusion avec un appel à l'action doux vers le bot : "Si tu veux un accompagnement quotidien sur ce sujet, ParentEase est à tes côtés sur WhatsApp et Telegram."]

${KNOWLEDGE}`;

// ─── User prompt ─────────────────────────────────────────────────────────────
const USER_PROMPT = `Rédige un article de blog ParentEase complet sur le sujet suivant :

SUJET : ${topic}
MOT-CLÉ SEO PRINCIPAL : ${keyword}
AUTEUR : ${author}
LANGUE DE RÉDACTION : ${lang}

Contraintes additionnelles :
- 1400-1800 mots au total
- Ton ParentEase (voir système)
- Respecte STRICTEMENT le format de sortie défini (front-matter + sections)
- Inclus au moins 2 références à des concepts évoqués dans la base de connaissances (attachement, discipline positive, CNV, développement, etc.) quand c'est pertinent
- Ne fabrique aucune URL, email, ou citation fictive

Renvoie UNIQUEMENT le markdown complet, rien d'autre.`;

// ─── LLM call ────────────────────────────────────────────────────────────────
async function generate() {
  const client = new OpenAI({
    apiKey:  process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1'
  });

  console.log(`\n📝 Génération d'article ParentEase`);
  console.log(`   Sujet    : ${topic}`);
  console.log(`   Mot-clé  : ${keyword}`);
  console.log(`   Auteur   : ${author}`);
  console.log(`   Langue   : ${lang}`);
  console.log(`   Modèle   : ${model}`);
  console.log(`   Provider : ${process.env.AI_BASE_URL || 'NVIDIA NIM'}`);
  console.log(`   Knowledge base : ${KNOWLEDGE.length} chars injectés\n`);
  console.log('⏳ Appel LLM en cours... (peut prendre 30-90s)\n');

  const started = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: USER_PROMPT }
    ],
    max_tokens:  4096,
    temperature: 0.75,
    top_p:       0.95
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const markdown = response.choices[0]?.message?.content || '';
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  if (!markdown || markdown.length < 500) {
    console.error('❌ Réponse LLM vide ou trop courte :');
    console.error(markdown);
    process.exit(2);
  }

  // ─── Save to drafts ────────────────────────────────────────────────────────
  const draftsDir = path.join(__dirname, '..', 'landing', 'blog', 'drafts');
  fs.mkdirSync(draftsDir, { recursive: true });

  const slug = slugify(topic);
  const filename = `${new Date().toISOString().slice(0, 10)}-${slug}.md`;
  const outPath = path.join(draftsDir, filename);
  fs.writeFileSync(outPath, markdown, 'utf8');

  console.log(`✅ Article généré en ${elapsed}s (${wordCount} mots, ${markdown.length} chars)`);
  console.log(`📁 ${path.relative(process.cwd(), outPath)}`);
  console.log(`\n🔎 Étapes suivantes :`);
  console.log(`   1. Review manuelle du brouillon`);
  console.log(`   2. Valider SEO (densité mot-clé, H2/H3, FAQ, meta)`);
  console.log(`   3. Relire ton + EEAT + factchecking`);
  console.log(`   4. Convertir en HTML (template landing/blog/) ou importer dans le CMS`);
  console.log(`   5. Publier manuellement après validation`);
}

generate().catch(err => {
  console.error('\n❌ Erreur de génération :', err.message);
  if (err.response?.data) console.error(err.response.data);
  process.exit(1);
});
