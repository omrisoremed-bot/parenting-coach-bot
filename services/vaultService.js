'use strict';

/**
 * vaultService.js — Obsidian-compatible markdown vault per user.
 *
 * Pourquoi un vault et pas une table SQL ?
 *   - Lisibilité humaine (peut être ouvert dans Obsidian, VS Code, vim)
 *   - Synchronisable avec l'app Obsidian de l'utilisateur via Obsidian Git
 *   - Format pérenne (markdown ≠ verrou propriétaire)
 *   - Frontmatter YAML compatible Dataview / autres plugins
 *
 * Structure :
 *   ${VAULT_PATH}/users/${phone-hash}/
 *     profile.md            ← snapshot du profil (1 fichier court, réécrit)
 *     memories.md           ← faits durables accumulés (append-only)
 *     insights.md           ← observations/hypothèses du coach (append-only)
 *     conversations/YYYY-MM.md  ← résumés conversationnels mensuels
 *
 * Hash téléphone :
 *   SHA-256 du phone, 12 premiers chars hex → pseudonymisation
 *   (déterministe pour retrouver le dossier, non réversible sans le phone).
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const VAULT_ROOT = process.env.VAULT_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/vault'
    : path.join(__dirname, '..', 'data', 'vault'));

function ensureRoot() {
  if (!fs.existsSync(VAULT_ROOT)) {
    fs.mkdirSync(VAULT_ROOT, { recursive: true });
    fs.mkdirSync(path.join(VAULT_ROOT, 'users'), { recursive: true });
    // Bootstrap a root README so Obsidian opens it gracefully
    fs.writeFileSync(path.join(VAULT_ROOT, 'README.md'),
      '# ParentAtEase Vault\n\nMémoires long terme par utilisateur (pseudonymisés).\n' +
      'Format Obsidian-compatible. Ne pas synchroniser publiquement.\n', 'utf8');
  }
}

function phoneHash(phone) {
  return crypto.createHash('sha256').update(String(phone)).digest('hex').slice(0, 12);
}

function userDir(phone) {
  ensureRoot();
  const dir = path.join(VAULT_ROOT, 'users', phoneHash(phone));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'conversations'), { recursive: true });
  }
  return dir;
}

// ─── Frontmatter helpers ─────────────────────────────────────────────────────
function buildFrontmatter(meta) {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

// ─── Profile snapshot (overwritten on update) ────────────────────────────────
function writeProfile(phone, profile) {
  try {
    const dir = userDir(phone);
    const fm = buildFrontmatter({
      type:        'profile',
      phone_hash:  phoneHash(phone),
      updated:     new Date().toISOString(),
      lang:        profile.language || 'fr',
    });
    const child = (profile.children || [])[0] || {};
    const body = [
      `# Profil parent`,
      ``,
      `**Prénom parent** : ${profile.parent?.name || '—'}`,
      `**Enfant** : ${child.name || '—'} · ${child.age_months ? `${Math.floor(child.age_months / 12)}a ${child.age_months % 12}m` : '—'}`,
      `**Défis** : ${(profile.challenges || []).join(', ') || '—'}`,
      `**Personnalité enfant** : ${child.personality || '—'}`,
      `**Besoins spéciaux** : ${child.special_needs || 'aucun'}`,
      `**Contexte culturel** : ${profile.cultural_context || '—'}`,
      ``,
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'profile.md'), fm + body, 'utf8');
  } catch (err) {
    logger.warn('vault.writeProfile failed', { error: err.message });
  }
}

function readProfile(phone) {
  try {
    const p = path.join(userDir(phone), 'profile.md');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  } catch { return ''; }
}

// ─── Memories (durable facts, append-only with dedup) ───────────────────────
function appendMemory(phone, fact) {
  if (!fact || typeof fact !== 'string') return;
  const clean = fact.trim().replace(/\n+/g, ' ').slice(0, 300);
  if (!clean) return;

  try {
    const dir = userDir(phone);
    const file = path.join(dir, 'memories.md');
    let content = '';
    if (fs.existsSync(file)) {
      content = fs.readFileSync(file, 'utf8');
      // Dedup naive : skip if same fact already present (case-insensitive)
      if (content.toLowerCase().includes(clean.toLowerCase())) return;
    } else {
      content = buildFrontmatter({
        type:       'memories',
        phone_hash: phoneHash(phone),
        created:    new Date().toISOString(),
      }) + `# Faits durables\n\n`;
    }
    const date = new Date().toISOString().slice(0, 10);
    content += `- ${date} — ${clean}\n`;
    fs.writeFileSync(file, content, 'utf8');
  } catch (err) {
    logger.warn('vault.appendMemory failed', { error: err.message });
  }
}

function readMemories(phone, maxLines = 50) {
  try {
    const file = path.join(userDir(phone), 'memories.md');
    if (!fs.existsSync(file)) return '';
    const body = fs.readFileSync(file, 'utf8').split('---\n').slice(-1)[0]; // skip frontmatter
    const lines = body.split('\n').filter(l => l.startsWith('- '));
    return lines.slice(-maxLines).join('\n');
  } catch { return ''; }
}

// ─── Insights (coach observations, e.g. patterns) ───────────────────────────
function appendInsight(phone, insight) {
  if (!insight) return;
  const clean = insight.trim().slice(0, 500);
  try {
    const dir = userDir(phone);
    const file = path.join(dir, 'insights.md');
    let content = '';
    if (fs.existsSync(file)) {
      content = fs.readFileSync(file, 'utf8');
    } else {
      content = buildFrontmatter({
        type:       'insights',
        phone_hash: phoneHash(phone),
        created:    new Date().toISOString(),
      }) + `# Observations du coach\n\n`;
    }
    const date = new Date().toISOString().slice(0, 10);
    content += `\n## ${date}\n\n${clean}\n`;
    fs.writeFileSync(file, content, 'utf8');
  } catch (err) {
    logger.warn('vault.appendInsight failed', { error: err.message });
  }
}

// ─── Monthly conversation log ───────────────────────────────────────────────
function appendConversationSummary(phone, summary) {
  if (!summary) return;
  try {
    const dir   = userDir(phone);
    const month = new Date().toISOString().slice(0, 7);
    const file  = path.join(dir, 'conversations', `${month}.md`);
    let content = '';
    if (fs.existsSync(file)) {
      content = fs.readFileSync(file, 'utf8');
    } else {
      content = buildFrontmatter({
        type:       'conversation-log',
        phone_hash: phoneHash(phone),
        month,
      }) + `# Conversations · ${month}\n\n`;
    }
    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
    content += `\n### ${ts}\n${summary.trim()}\n`;
    fs.writeFileSync(file, content, 'utf8');
  } catch (err) {
    logger.warn('vault.appendConversationSummary failed', { error: err.message });
  }
}

// ─── Path introspection (useful for debugging / admin) ──────────────────────
function getUserVaultInfo(phone) {
  const dir = userDir(phone);
  return {
    hash:           phoneHash(phone),
    dir,
    profilePath:    path.join(dir, 'profile.md'),
    memoriesPath:   path.join(dir, 'memories.md'),
    insightsPath:   path.join(dir, 'insights.md'),
    conversationsDir: path.join(dir, 'conversations'),
  };
}

module.exports = {
  VAULT_ROOT,
  phoneHash,
  userDir,
  writeProfile,
  readProfile,
  appendMemory,
  readMemories,
  appendInsight,
  appendConversationSummary,
  getUserVaultInfo,
};
