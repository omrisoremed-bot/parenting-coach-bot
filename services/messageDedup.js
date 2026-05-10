'use strict';

/**
 * messageDedup.js — Persistent webhook deduplication.
 *
 * Replaces the in-memory Set approach (lost on restart) with a SQLite-backed
 * store. Same TTL (24h) as the old setTimeout cleanup, but resilient across
 * Railway redeploys.
 *
 * API :
 *   isAlreadyProcessed(messageId) -> boolean
 *   markProcessed(messageId)
 *   cleanupOld()      // run via cron daily — deletes rows older than TTL_HOURS
 *
 * Used in : bot.js webhook handlers (Meta + Twilio)
 */

const { getDb } = require('./database');
const logger    = require('./logger');

const TTL_HOURS = 24;

/**
 * Returns true if the message ID was already seen.
 * Never throws — duplicate detection failures must not break webhook processing.
 */
function isAlreadyProcessed(messageId) {
  if (!messageId) return false;
  try {
    const row = getDb()
      .prepare('SELECT 1 FROM processed_message_ids WHERE message_id = ?')
      .get(messageId);
    return !!row;
  } catch (err) {
    logger.warn('messageDedup.isAlreadyProcessed failed', { messageId, error: err.message });
    return false; // fail-open: better to process a duplicate than drop a legitimate message
  }
}

/**
 * Marks a message as processed. Uses INSERT OR IGNORE for idempotency.
 */
function markProcessed(messageId) {
  if (!messageId) return;
  try {
    getDb()
      .prepare('INSERT OR IGNORE INTO processed_message_ids (message_id) VALUES (?)')
      .run(messageId);
  } catch (err) {
    logger.warn('messageDedup.markProcessed failed', { messageId, error: err.message });
  }
}

/**
 * Deletes rows older than TTL_HOURS hours.
 * Called daily via cron/index.js at 03:00.
 */
function cleanupOld() {
  try {
    const cutoff = new Date(Date.now() - TTL_HOURS * 3600 * 1000).toISOString();
    const result = getDb()
      .prepare(`DELETE FROM processed_message_ids WHERE processed_at < ?`)
      .run(cutoff);
    logger.info('messageDedup cleanup done', { deleted: result.changes, cutoff });
    return result.changes;
  } catch (err) {
    logger.warn('messageDedup.cleanupOld failed', { error: err.message });
    return 0;
  }
}

module.exports = { isAlreadyProcessed, markProcessed, cleanupOld, TTL_HOURS };
