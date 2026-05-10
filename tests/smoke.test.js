'use strict';

/**
 * smoke.test.js — Basic invariants of the ParentAtEase bot.
 *
 * Run :
 *   npm test
 *
 * No external services required (no LLM calls, no Telegram/Twilio/Meta).
 * Tests use the local SQLite DB at ./data/parenting_coach.db (or DB_PATH).
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');

// ─── promptBuilder is a true singleton via Node's require cache ─────────────
test('promptBuilder is a require-cache singleton', () => {
  const a = require('../services/promptBuilder');
  const b = require('../services/promptBuilder');
  assert.equal(a, b, 'two requires should return the same exports object');
  assert.ok(typeof a.systemPrompt === 'string', 'systemPrompt should be a string');
  assert.ok(a.systemPrompt.length > 1000, 'systemPrompt should be > 1000 chars');
});

// ─── Database initializes and can answer a basic query ──────────────────────
test('database initializes and supports SELECT 1', () => {
  const { getDb } = require('../services/database');
  const db = getDb();
  const row = db.prepare('SELECT 1 AS ok').get();
  assert.equal(row.ok, 1);
});

// ─── Knowledge base is non-empty ─────────────────────────────────────────────
test('knowledge base directory has at least 8 markdown files', () => {
  const knowledgeDir = path.join(__dirname, '..', 'knowledge');
  const mdFiles = fs.readdirSync(knowledgeDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));
  assert.ok(mdFiles.length >= 8, `expected >= 8 .md files, got ${mdFiles.length}`);

  // Total chars across MD files should exceed 30K (sanity check)
  let total = 0;
  for (const f of mdFiles) total += fs.statSync(path.join(knowledgeDir, f)).size;
  assert.ok(total > 30_000, `knowledge MD total too small (${total} bytes)`);
});

// ─── messageDedup correctly detects duplicates ──────────────────────────────
test('messageDedup detects duplicates and is idempotent', () => {
  const { isAlreadyProcessed, markProcessed } = require('../services/messageDedup');
  const id = 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  assert.equal(isAlreadyProcessed(id), false, 'fresh id should not be marked');
  markProcessed(id);
  assert.equal(isAlreadyProcessed(id), true, 'after mark, should be marked');
  markProcessed(id); // should not throw on duplicate insert
  assert.equal(isAlreadyProcessed(id), true, 'still marked after re-mark');
});

// ─── Package.json reflects rebrand ───────────────────────────────────────────
test('package.json reflects ParentAtEase rebrand', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.name, 'parentatease');
  assert.match(pkg.description, /ParentAtEase/i);
});

// ─── Bot module loads without throwing (no listen, no cron) ─────────────────
test('all critical service modules load without throwing', () => {
  assert.doesNotThrow(() => require('../services/database'));
  assert.doesNotThrow(() => require('../services/logger'));
  assert.doesNotThrow(() => require('../services/messageDedup'));
  assert.doesNotThrow(() => require('../services/aiService'));
  assert.doesNotThrow(() => require('../handlers/profileLoader'));
  assert.doesNotThrow(() => require('../handlers/messageHandler'));
});

// ─── Onboarding step-1 parser extracts parent + child age ───────────────────
test('parseStep1 extracts parent name and child age from free text', () => {
  const { parseStep1 } = require('../handlers/onboardingFlow');

  const r1 = parseStep1('Sarah, mon fils Yassine a 3 ans');
  assert.equal(r1.parentName, 'Sarah');
  assert.equal(r1.childAge, 3);
  assert.equal(r1.childAgeMonths, 36);

  const r2 = parseStep1('Aïcha — Lina, 18 mois');
  assert.equal(r2.parentName, 'Aïcha');
  assert.equal(r2.childAgeMonths, 18);

  const r3 = parseStep1('Marie, ma fille Lila a 2 ans et 4 mois');
  assert.equal(r3.parentName, 'Marie');
  assert.equal(r3.childAgeMonths, 28);

  // Edge case : age missing → ageMonths = 0 (caller will re-prompt)
  const r4 = parseStep1('Just a name with no age');
  assert.equal(r4.childAgeMonths, 0);
});

// ─── Onboarding STEPS array reflects the 3+1 (lang) flow ────────────────────
test('onboarding STEPS array has exactly 4 entries (lang + 3 questions)', () => {
  const { STEPS } = require('../handlers/onboardingFlow');
  assert.equal(STEPS.length, 4, 'Flow should be: lang -> parent/child -> challenge -> confirm');
  assert.equal(STEPS[3].action, 'GENERATE_PROGRAM');
});
