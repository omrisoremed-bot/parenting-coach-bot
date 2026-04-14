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

// Dossier data/ à la racine du projet (persiste sur Railway via volume ou en mémoire)
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'parenting_coach.db');

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
