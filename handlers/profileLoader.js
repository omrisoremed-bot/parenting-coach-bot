'use strict';

/**
 * profileLoader.js — Accès aux profils utilisateurs via SQLite
 *
 * API publique IDENTIQUE à l'ancienne version JSON :
 *   loadProfile(phone)           → profile | null
 *   saveProfile(phone, data)     → void
 *   createProfile(phone)         → profile
 *   updateProfile(phone, updates)→ profile
 *   getAllActiveUsers()           → profile[]
 *   getAllUsers()                 → profile[]
 *
 * Les données imbriquées (parent, children, challenges, weekly_checkins)
 * sont stockées en JSON TEXT dans SQLite et (dé)sérialisées automatiquement.
 */

const { getDb } = require('../services/database');
const logger = require('../services/logger');

// ── Colonnes JSON (stockées sous forme TEXT, parsées à la lecture) ──────────
const JSON_COLS = ['parent', 'children', 'challenges', 'weekly_checkins'];

/**
 * Convertit une ligne SQLite brute en objet profil JS.
 */
function rowToProfile(row) {
  if (!row) return null;
  const p = { ...row };
  for (const col of JSON_COLS) {
    try {
      p[col] = JSON.parse(p[col] || (col === 'parent' ? '{}' : '[]'));
    } catch {
      p[col] = col === 'parent' ? {} : [];
    }
  }
  p.onboarding_complete = p.onboarding_complete === 1;
  p.cron_active         = p.cron_active === 1;
  return p;
}

/**
 * Convertit un objet profil JS en colonnes SQLite (JSON sérialisés).
 */
function profileToRow(p) {
  const row = { ...p };
  for (const col of JSON_COLS) {
    row[col] = JSON.stringify(p[col] ?? (col === 'parent' ? {} : []));
  }
  row.onboarding_complete = p.onboarding_complete ? 1 : 0;
  row.cron_active         = p.cron_active ? 1 : 0;
  return row;
}

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Charger un profil. Retourne null si inexistant.
 */
function loadProfile(phone) {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    return rowToProfile(row);
  } catch (err) {
    logger.error('loadProfile error', { phone, error: err.message });
    return null;
  }
}

/**
 * Sauvegarder (créer ou remplacer) un profil complet.
 */
function saveProfile(phone, data) {
  try {
    const db  = getDb();
    const row = profileToRow({ ...data, phone, last_active: new Date().toISOString() });

    db.prepare(`
      INSERT INTO users (
        phone, language, onboarding_complete, onboarding_step,
        created_at, last_active, cron_active, session_state,
        parent, children, challenges, parenting_style, cultural_context, weekly_checkins
      ) VALUES (
        @phone, @language, @onboarding_complete, @onboarding_step,
        @created_at, @last_active, @cron_active, @session_state,
        @parent, @children, @challenges, @parenting_style, @cultural_context, @weekly_checkins
      )
      ON CONFLICT(phone) DO UPDATE SET
        language            = excluded.language,
        onboarding_complete = excluded.onboarding_complete,
        onboarding_step     = excluded.onboarding_step,
        last_active         = excluded.last_active,
        cron_active         = excluded.cron_active,
        session_state       = excluded.session_state,
        parent              = excluded.parent,
        children            = excluded.children,
        challenges          = excluded.challenges,
        parenting_style     = excluded.parenting_style,
        cultural_context    = excluded.cultural_context,
        weekly_checkins     = excluded.weekly_checkins
    `).run(row);

    logger.debug('Profile saved', { phone });
  } catch (err) {
    logger.error('saveProfile error', { phone, error: err.message });
    throw err;
  }
}

/**
 * Créer un nouveau profil vierge.
 */
function createProfile(phone) {
  const profile = {
    phone,
    language: 'fr',
    onboarding_complete: false,
    onboarding_step: 0,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    cron_active: false,
    parent: {},
    children: [],
    challenges: [],
    parenting_style: '',
    cultural_context: '',
    weekly_checkins: [],
    session_state: 'onboarding'
  };
  saveProfile(phone, profile);
  return profile;
}

/**
 * Mettre à jour certains champs (merge superficiel au niveau racine).
 */
function updateProfile(phone, updates) {
  const existing = loadProfile(phone) || createProfile(phone);
  const updated  = {
    ...existing,
    ...updates,
    last_active: new Date().toISOString()
  };
  saveProfile(phone, updated);
  return updated;
}

/**
 * Tous les utilisateurs avec cron actif et onboarding terminé.
 */
function getAllActiveUsers() {
  try {
    const db   = getDb();
    const rows = db.prepare(
      'SELECT * FROM users WHERE cron_active = 1 AND onboarding_complete = 1'
    ).all();
    return rows.map(rowToProfile);
  } catch (err) {
    logger.error('getAllActiveUsers error', { error: err.message });
    return [];
  }
}

/**
 * Tous les utilisateurs (admin).
 */
function getAllUsers() {
  try {
    const db   = getDb();
    const rows = db.prepare('SELECT * FROM users').all();
    return rows.map(rowToProfile);
  } catch (err) {
    logger.error('getAllUsers error', { error: err.message });
    return [];
  }
}

module.exports = {
  loadProfile,
  saveProfile,
  createProfile,
  updateProfile,
  getAllActiveUsers,
  getAllUsers
};
