'use strict';

/**
 * database.js — Initialisation SQLite (better-sqlite3)
 *
 * Schéma :
 *   users  — profil complet + état session
 *   conversation_history — historique messages (optionnel, Étape 2)
 */

const path = require('path');
const fs   = require('fs');
const Database = require('better-sqlite3');
const logger = require('./logger');

// ─── DB path resolution ─────────────────────────────────────────────────────
//   Production (Railway with volume) :  DB_PATH=/data/parenting_coach.db
//   Local dev                         :  fallback to ./data/parenting_coach.db
//
// The Railway filesystem outside /data is EPHEMERAL — every deploy wipes it.
// A persistent volume MUST be mounted at /data (configured in Railway dashboard).
// See docs/ops/sqlite-persistence.md for the setup procedure.
const LEGACY_DIR  = path.join(__dirname, '..', 'data');
const LEGACY_PATH = path.join(LEGACY_DIR, 'parenting_coach.db');
const DB_PATH     = process.env.DB_PATH || LEGACY_PATH;

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ─── One-time migration from legacy path to volume ──────────────────────────
// Idempotent : runs only if DB_PATH points elsewhere AND target doesn't exist yet
// AND legacy DB has data. Preserves WAL + SHM to avoid losing uncommitted writes.
if (DB_PATH !== LEGACY_PATH && !fs.existsSync(DB_PATH) && fs.existsSync(LEGACY_PATH)) {
  logger.info('Migrating SQLite from legacy path to persistent volume', {
    from: LEGACY_PATH,
    to:   DB_PATH
  });
  fs.copyFileSync(LEGACY_PATH, DB_PATH);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(LEGACY_PATH + suffix)) {
      fs.copyFileSync(LEGACY_PATH + suffix, DB_PATH + suffix);
    }
  }
  logger.info('SQLite migration complete');
}

let _db = null;

function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Performance : WAL mode (concurrent reads, safe writes)
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // ── Schéma ────────────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone               TEXT PRIMARY KEY,
      language            TEXT    NOT NULL DEFAULT 'fr',
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      onboarding_step     INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      last_active         TEXT    NOT NULL DEFAULT (datetime('now')),
      cron_active         INTEGER NOT NULL DEFAULT 0,
      session_state       TEXT    NOT NULL DEFAULT 'onboarding',
      parent              TEXT    NOT NULL DEFAULT '{}',
      children            TEXT    NOT NULL DEFAULT '[]',
      challenges          TEXT    NOT NULL DEFAULT '[]',
      parenting_style     TEXT    NOT NULL DEFAULT '',
      cultural_context    TEXT    NOT NULL DEFAULT '',
      weekly_checkins     TEXT    NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS conversation_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      phone       TEXT    NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
      role        TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversation_history(phone);

    -- ── Webapp auth ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS otp_codes (
      phone       TEXT    NOT NULL,
      code        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT    NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (phone, code)
    );
    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT    PRIMARY KEY,
      phone       TEXT    NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);

    -- ── Webhook deduplication (anti-replay) ─────────────────────────────────
    -- Stores message IDs already processed. TTL 24h, cleaned daily by cron.
    -- Survives bot restarts (vs. in-memory Set which loses state on redeploy).
    CREATE TABLE IF NOT EXISTS processed_message_ids (
      message_id   TEXT    PRIMARY KEY,
      processed_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_processed_at ON processed_message_ids(processed_at);
  `);

  // ── One-shot data migration : onboarding 8→3 steps (2026-05-10) ─────────────
  // Users mid-onboarding at old step >= 3 (challenges, family, culture answered)
  // are considered "complete" under the new shorter flow. Idempotent thanks to
  // AND onboarding_complete = 0 — a no-op after first run.
  _db.exec(`
    UPDATE users
       SET onboarding_complete = 1,
           session_state       = 'idle'
     WHERE onboarding_step >= 3
       AND onboarding_complete = 0;
  `);

  logger.info('SQLite database ready', { path: DB_PATH });
  return _db;
}

/**
 * Append a message to the conversation history (used by webapp to show recent exchanges).
 * Never throws — logging must never break the bot flow.
 */
function logMessage(phone, role, content) {
  try {
    getDb()
      .prepare(`INSERT INTO conversation_history (phone, role, content) VALUES (?, ?, ?)`)
      .run(phone, role, content);
  } catch (err) {
    logger.warn('logMessage failed', { phone, error: err.message });
  }
}

module.exports = { getDb, DB_PATH, logMessage };
