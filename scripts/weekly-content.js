#!/usr/bin/env node
'use strict';

/**
 * weekly-content.js — Générateur de contenu hebdomadaire ParentEase
 *
 * Génère automatiquement 3 articles + leurs posts sociaux pour un auteur donné,
 * en s'appuyant sur les plans de contenu dans scripts/content-plans/.
 *
 * Usage :
 *   node scripts/weekly-content.js --author etienne-bouchard --week 1
 *   node scripts/weekly-content.js --author dr-amara-diallo --week 3 --dry-run
 *   node scripts/weekly-content.js --author etienne-bouchard --week 2 --social
 *
 * Options :
 *   --author    ID de l'auteur (ex: etienne-bouchard, dr-amara-diallo)  [requis]
 *   --week      Numéro de semaine 1-12                                   [requis]
 *   --dry-run   Affiche le plan sans générer                             [optionnel]
 *   --social    Lance aussi le pipeline social (article-to-social) après génération [optionnel]
 *   --article   Génère un seul article (1, 2 ou 3) au lieu des 3        [optionnel]
 *   --lang      Langue (défaut: fr)                                      [optionnel]
 *
 * Sortie :
 *   landing/blog/drafts/<date>-<slug>.md   (articles)
 *   landing/blog/social/<date>-<slug>/     (posts sociaux, si --social)
 *
 * Prérequis :
 *   - scripts/content-plans/<author-id>.json  (banque de sujets)
 *   - docs/editorial/authors/<author-id>.md   (profil auteur)
 *   - .env avec AI_API_KEY + AI_BASE_URL
 */

require('dotenv').config();
const fs         = require('fs');
const path       = require('path');
const { execSync } = require('child_process');

// ─── CLI args ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key   = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

const args    = parseArgs(process.argv);
const authorId = args.author;
const weekNum  = parseInt(args.week, 10);
const dryRun   = args['dry-run'] === true;
const withSocial = args.social === true;
const onlyArticle = args.article ? parseInt(args.article, 10) : null;
const lang     = args.lang || 'fr';

if (!authorId || !weekNum) {
  console.error(`
❌ Arguments manquants.

Usage :
  node scripts/weekly-content.js --author <id> --week <1-12> [options]

Auteurs disponibles :
  dr-amara-diallo     (Pédiatrie · Montréal)
  etienne-bouchard    (Sommeil enfant · Vancouver)

Options :
  --dry-run       Afficher le plan sans générer
  --social        Lancer le pipeline social après chaque article
  --article 1|2|3 Générer un seul article de la semaine
  --lang fr|en    Langue de rédaction (défaut: fr)

Exemples :
  node scripts/weekly-content.js --author etienne-bouchard --week 1
  node scripts/weekly-content.js --author dr-amara-diallo --week 3 --dry-run
  node scripts/weekly-content.js --author etienne-bouchard --week 2 --social
  node scripts/weekly-content.js --author dr-amara-diallo --week 4 --article 2
`);
  process.exit(1);
}

// ─── Charger le plan de contenu ───────────────────────────────────────────────
const planPath = path.join(__dirname, 'content-plans', `${authorId}.json`);
if (!fs.existsSync(planPath)) {
  console.error(`❌ Plan de contenu introuvable : ${planPath}`);
  console.error(`   Auteurs disponibles : dr-amara-diallo, etienne-bouchard`);
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const weekData = plan.weeks.find(w => w.semaine === weekNum);

if (!weekData) {
  console.error(`❌ Semaine ${weekNum} introuvable dans le plan de ${authorId}. Plage valide : 1–12.`);
  process.exit(1);
}

// ─── Charger le profil auteur ─────────────────────────────────────────────────
const profilePath = path.join(__dirname, '..', plan.author_profile);
let authorBio = '';
if (fs.existsSync(profilePath)) {
  authorBio = fs.readFileSync(profilePath, 'utf8');
}

// ─── Afficher le plan ─────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════');
console.log(`📅 CONTENU HEBDOMADAIRE — ${plan.author_name}`);
console.log('════════════════════════════════════════════════════════');
console.log(`   Semaine ${weekNum} : ${weekData.theme}`);
console.log(`   Cadence : ${plan.cadence}`);
console.log(`   Langue  : ${lang}`);
console.log(`   Mode    : ${dryRun ? '🔍 DRY RUN (simulation)' : '⚡ GÉNÉRATION RÉELLE'}`);
console.log(`   Social  : ${withSocial ? '✅ activé (pipeline X + IG + LI + visuel)' : '⏭️  désactivé'}`);
console.log('────────────────────────────────────────────────────────');

weekData.articles.forEach((article, i) => {
  const day = ['Lundi', 'Mercredi', 'Vendredi'][i];
  console.log(`\n  Article ${i + 1} — ${day}`);
  console.log(`  📝 ${article.topic}`);
  console.log(`  🔑 Mot-clé : ${article.keyword}`);
  console.log(`  🏷  Spécialité : ${article.specialite}`);
  console.log(`  📚 Sources : ${article.knowledge_refs.join(', ')}`);
});

console.log('\n════════════════════════════════════════════════════════\n');

if (dryRun) {
  console.log('✅ Dry run terminé — aucun fichier créé.');
  console.log('   Relancez sans --dry-run pour générer le contenu.\n');
  process.exit(0);
}

// ─── Génération des articles ──────────────────────────────────────────────────
const articles = onlyArticle
  ? [weekData.articles[onlyArticle - 1]].filter(Boolean)
  : weekData.articles;

if (onlyArticle && !weekData.articles[onlyArticle - 1]) {
  console.error(`❌ Article ${onlyArticle} introuvable (la semaine en contient ${weekData.articles.length}).`);
  process.exit(1);
}

const generateScript = path.join(__dirname, 'generate-article.js');
const socialScript   = path.join(__dirname, 'article-to-social.js');
const generated = [];

for (const [idx, article] of articles.entries()) {
  const articleNum = onlyArticle || (idx + 1);
  const day = ['Lundi', 'Mercredi', 'Vendredi'][idx];
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`📝 Article ${articleNum}/3 — ${day} — ${article.specialite}`);
  console.log(`   ${article.topic}`);
  console.log(`${'─'.repeat(56)}\n`);

  // Construire le contexte auteur à passer comme note supplémentaire dans le topic
  const authorContext = authorBio
    ? `\n\n[CONTEXTE AUTEUR — à utiliser pour personnaliser la voix et les références :\n${authorBio.slice(0, 1500)}]`
    : '';

  const topicWithContext = article.topic + authorContext;

  try {
    // Appel à generate-article.js
    const cmd = [
      `node "${generateScript}"`,
      `--topic "${article.topic.replace(/"/g, '\\"')}"`,
      `--keyword "${article.keyword.replace(/"/g, '\\"')}"`,
      `--author "${plan.author_name}"`,
      `--lang "${lang}"`,
    ].join(' ');

    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    // Trouver le fichier généré (le plus récent dans drafts/)
    const draftsDir = path.join(__dirname, '..', 'landing', 'blog', 'drafts');
    if (fs.existsSync(draftsDir)) {
      const drafts = fs.readdirSync(draftsDir)
        .filter(f => f.endsWith('.md'))
        .map(f => ({ name: f, time: fs.statSync(path.join(draftsDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (drafts.length > 0) {
        const latestDraft = path.join(draftsDir, drafts[0].name);
        generated.push({ article, file: latestDraft });

        // Pipeline social si demandé
        if (withSocial) {
          console.log(`\n🚀 Pipeline social pour : ${drafts[0].name}\n`);
          const socialCmd = [
            `node "${socialScript}"`,
            `--input "${path.relative(path.join(__dirname, '..'), latestDraft).replace(/\\/g, '/')}"`,
            `--lang "${lang}"`
          ].join(' ');
          execSync(socialCmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        }
      }
    }

  } catch (err) {
    console.error(`\n❌ Erreur génération article ${articleNum} : ${err.message}`);
    console.error('   Les articles suivants seront quand même tentés.\n');
  }
}

// ─── Rapport final ────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════');
console.log('✅ SEMAINE GÉNÉRÉE');
console.log('════════════════════════════════════════════════════════\n');

console.log(`Auteur  : ${plan.author_name}`);
console.log(`Semaine : ${weekNum} — ${weekData.theme}`);
console.log(`Articles générés : ${generated.length}/${articles.length}\n`);

generated.forEach(({ article, file }, i) => {
  const day = ['Lundi', 'Mercredi', 'Vendredi'][i];
  console.log(`  ${day} ▸ ${path.relative(path.join(__dirname, '..'), file)}`);
  console.log(`        "${article.topic.slice(0, 60)}..."`);
});

console.log('\n🔎 Étapes suivantes :');
console.log('   1. Review manuelle des 3 brouillons (ton auteur, exactitude, EEAT)');
console.log('   2. Vérifier la densité mot-clé et la structure H2/H3 de chaque article');
console.log('   3. Valider les visuels générés dans landing/blog/social/');
if (!withSocial) {
  console.log('   4. Lancer le pipeline social : npm run social -- --input <fichier.md>');
}
console.log('   5. Programmer la publication (Lundi · Mercredi · Vendredi)');
console.log('   6. Relancer la semaine suivante : --week', weekNum + 1, '\n');
