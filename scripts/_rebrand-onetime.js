#!/usr/bin/env node
'use strict';

/**
 * _rebrand-onetime.js — One-shot rebrand ParentEase → ParentAtEase
 *
 * Run ONCE on the codebase, then keep this file in the repo as documentation
 * of the rebrand. Do not re-run (idempotent in theory, but unnecessary).
 *
 * Substitution order matters:
 *   1. Protect competitor URLs (parentease.app, parentease.ca) with sentinels
 *   2. Apply transforms (Telegram handle, Netlify subdomain, brand name, casing)
 *   3. Restore competitor URLs
 *
 * Usage:
 *   node scripts/_rebrand-onetime.js [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Files from pre-flight grep — 32 hits (excluding node_modules)
const FILES = [
  'docs/ANALYSE-COMPLETE-2026-05-10.md',
  'scripts/inject-jsonld.js',
  'scripts/generate-sitemap.js',
  'landing/redesign/index.html',
  'docs/analytics/tracking-plan.md',
  'docs/strategy/audit-strategique.md',
  'docs/editorial/workflow-redaction.md',
  'scripts/weekly-content.js',
  'webapp/index.html',
  'webapp/dashboard.html',
  'webapp/app.js',
  'tasks/todo.md',
  'scripts/generate-article.js',
  'scripts/article-to-social.js',
  'landing/pt/index.html',
  'landing/netlify/functions/chat.js',
  'landing/index.html',
  'landing/es/index.html',
  'landing/en/index.html',
  'landing/blog/style-parental-autoritatif.html',
  'landing/blog/sommeil-enfant-developpement.html',
  'landing/blog/ecrans-enfants-developpement.html',
  'landing/blog/crises-colere-enfant.html',
  'landing/blog/communication-parents-adolescents.html',
  'landing/blog/attachement-secure-bebe.html',
  'landing/ar/index.html',
  'handlers/webappApi.js',
  'handlers/onboardingFlow.js',
  'docs/superpowers/specs/2026-04-13-parentease-redesign.md',
  'SOMMAIRE.md',
  'PRD.md',
  'CLAUDE_SKILLS.md',
];

const TRANSFORMS = [
  // 1. Protect competitor URLs (must not be touched — they are competitors' real domains)
  [/parentease\.app/g,             '__PE_COMPETITOR_APP__'],
  [/parentease\.ca/g,              '__PE_COMPETITOR_CA__'],

  // 2. Telegram handle (longest match first): @ParentEasebot → @ParentAtEaseBot
  [/@ParentEasebot/g,              '@ParentAtEaseBot'],
  [/ParentEasebot/g,               'ParentAtEaseBot'],

  // 3. Netlify subdomain rebrand (old Netlify URL → new placeholder)
  [/parentflow-ai\.netlify\.app/g, 'parentatease.netlify.app'],

  // 4. Brand name transforms (longest first, case-sensitive)
  [/ParentEase/g,                  'ParentAtEase'],
  [/Parent Ease/g,                 'Parent At Ease'],
  [/PARENTEASE/g,                  'PARENTATEASE'],
  [/parentease/g,                  'parentatease'],

  // 5. Restore competitor URLs
  [/__PE_COMPETITOR_APP__/g,       'parentease.app'],
  [/__PE_COMPETITOR_CA__/g,        'parentease.ca'],
];

const report = { changed: [], unchanged: [], missing: [], totalSubs: 0 };

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    report.missing.push(file);
    continue;
  }

  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let subsThisFile = 0;

  for (const [pattern, replacement] of TRANSFORMS) {
    const matches = after.match(pattern);
    if (matches) subsThisFile += matches.length;
    after = after.replace(pattern, replacement);
  }

  // Don't count the protect/restore sentinel substitutions
  // (they cancel each other for unchanged competitor URLs)
  const realSubs = (before.match(/parent[aA]?[tT]?[eE]ase/gi) || []).length -
                   (after.match(/parentease\.(app|ca)/gi) || []).length * 0;

  if (before !== after) {
    if (!DRY_RUN) fs.writeFileSync(file, after, 'utf8');
    report.changed.push({ file, subs: subsThisFile });
    report.totalSubs += subsThisFile;
  } else {
    report.unchanged.push(file);
  }
}

// Final report
console.log(`\n=== Rebrand ${DRY_RUN ? 'DRY-RUN' : 'EXECUTED'} ===\n`);
console.log(`✓ Changed: ${report.changed.length} file(s)`);
for (const { file, subs } of report.changed) {
  console.log(`    ${file} (${subs} substitutions)`);
}
if (report.unchanged.length) {
  console.log(`\n○ Unchanged: ${report.unchanged.length} file(s)`);
  for (const f of report.unchanged) console.log(`    ${f}`);
}
if (report.missing.length) {
  console.log(`\n✗ Missing: ${report.missing.length} file(s)`);
  for (const f of report.missing) console.log(`    ${f}`);
}
console.log(`\nTotal substitutions: ${report.totalSubs}`);
console.log(`Sentinel intact?     ${report.totalSubs > 0 ? 'verify with grep below' : 'n/a'}`);
console.log(`\nNext: grep -rn --include='*.{js,md,html,json}' 'parentease' . | grep -v 'parentease\\.app' | grep -v 'parentease\\.ca'\n`);
