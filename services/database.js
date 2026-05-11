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

    -- ── Billing (Stripe subscriptions) ──────────────────────────────────────
    -- One row per user. Updated by Stripe webhook (handlers/billingHandler.js).
    -- status values mirror Stripe: trialing|active|past_due|canceled|incomplete|...
    CREATE TABLE IF NOT EXISTS subscriptions (
      phone               TEXT    PRIMARY KEY REFERENCES users(phone) ON DELETE CASCADE,
      stripe_customer_id  TEXT    NOT NULL UNIQUE,
      stripe_subscription_id TEXT NOT NULL UNIQUE,
      tier                TEXT    NOT NULL,        -- 'family' | 'atelier'
      status              TEXT    NOT NULL,        -- Stripe subscription.status
      cadence             TEXT    NOT NULL,        -- 'monthly' | 'yearly'
      current_period_end  TEXT,                    -- ISO timestamp
      trial_end           TEXT,                    -- ISO timestamp, null if past
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sub_status   ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_sub_customer ON subscriptions(stripe_customer_id);

    -- ── Leads (email signups via lead magnet) ───────────────────────────────
    CREATE TABLE IF NOT EXISTS leads (
      email          TEXT PRIMARY KEY,
      first_name     TEXT,
      lang           TEXT NOT NULL DEFAULT 'fr',
      source         TEXT NOT NULL DEFAULT '50-phrases',  -- which lead magnet
      consent_at     TEXT NOT NULL DEFAULT (datetime('now')),
      day0_sent_at   TEXT,                                  -- welcome + PDF link
      day3_sent_at   TEXT,                                  -- value email
      day7_sent_at   TEXT,                                  -- soft CTA
      unsubscribed   INTEGER NOT NULL DEFAULT 0,
      converted_at   TEXT,                                  -- if they subscribed
      ip             TEXT,                                  -- for fraud detection
      user_agent     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_leads_lang ON leads(lang);
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

/**
 * Check whether a user has an active (paid or trialing) subscription.
 * Returns the subscription row if active, null otherwise.
 *
 * Active = status in ('trialing','active','past_due') AND not yet expired.
 * 'past_due' is included to give a 7-day grace period for failed payment
 * recovery (Stripe Smart Retries handles this).
 */
function getActiveSubscription(phone) {
  try {
    const row = getDb()
      .prepare(`
        SELECT * FROM subscriptions
        WHERE phone = ?
          AND status IN ('trialing','active','past_due')
          AND (current_period_end IS NULL OR current_period_end > datetime('now', '-7 days'))
        LIMIT 1
      `)
      .get(phone);
    return row || null;
  } catch (err) {
    logger.warn('getActiveSubscription failed', { phone, error: err.message });
    return null;
  }
}

/**
 * Upsert subscription row (called from Stripe webhook).
 */
function upsertSubscription(sub) {
  const db = getDb();
  db.prepare(`
    INSERT INTO subscriptions (
      phone, stripe_customer_id, stripe_subscription_id, tier, status,
      cadence, current_period_end, trial_end, cancel_at_period_end, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(phone) DO UPDATE SET
      stripe_customer_id     = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      tier                   = excluded.tier,
      status                 = excluded.status,
      cadence                = excluded.cadence,
      current_period_end     = excluded.current_period_end,
      trial_end              = excluded.trial_end,
      cancel_at_period_end   = excluded.cancel_at_period_end,
      updated_at             = datetime('now')
  `).run(
    sub.phone, sub.stripe_customer_id, sub.stripe_subscription_id,
    sub.tier, sub.status, sub.cadence,
    sub.current_period_end || null, sub.trial_end || null,
    sub.cancel_at_period_end ? 1 : 0
  );
}

function findSubscriptionByCustomerId(customerId) {
  return getDb()
    .prepare('SELECT * FROM subscriptions WHERE stripe_customer_id = ?')
    .get(customerId);
}

// ─── Leads (lead magnet email signups) ────────────────────────────────────
function upsertLead(lead) {
  getDb().prepare(`
    INSERT INTO leads (email, first_name, lang, source, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      first_name = excluded.first_name,
      lang       = excluded.lang,
      unsubscribed = 0
  `).run(
    lead.email.toLowerCase().trim(),
    lead.first_name || null,
    lead.lang || 'fr',
    lead.source || '50-phrases',
    lead.ip || null,
    lead.user_agent || null
  );
}

function findLeadsToSend(stage) {
  // stage = 'day0' | 'day3' | 'day7'
  const ageDaysByStage = { day0: 0, day3: 3, day7: 7 };
  const days = ageDaysByStage[stage];
  if (days === undefined) return [];

  const sentColumn = `${stage}_sent_at`;
  const consentCondition = days === 0
    ? "datetime('now') >= consent_at"
    : `datetime('now') >= datetime(consent_at, '+${days} days')`;

  return getDb().prepare(`
    SELECT email, first_name, lang, consent_at
      FROM leads
     WHERE unsubscribed = 0
       AND ${sentColumn} IS NULL
       AND ${consentCondition}
     LIMIT 500
  `).all();
}

function markLeadSent(email, stage) {
  const sentColumn = `${stage}_sent_at`;
  getDb().prepare(`UPDATE leads SET ${sentColumn} = datetime('now') WHERE email = ?`)
    .run(email.toLowerCase().trim());
}

function unsubscribeLead(email) {
  getDb().prepare('UPDATE leads SET unsubscribed = 1 WHERE email = ?')
    .run(email.toLowerCase().trim());
}

module.exports = {
  getDb, DB_PATH, logMessage,
  getActiveSubscription, upsertSubscription, findSubscriptionByCustomerId,
  upsertLead, findLeadsToSend, markLeadSent, unsubscribeLead,
};
