'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');

const USERS_DIR = path.join(__dirname, '..', 'users');

// Ensure users directory exists
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

function profilePath(phone) {
  // Sanitize phone number for safe filename
  const safe = phone.replace(/[^0-9+]/g, '');
  return path.join(USERS_DIR, `${safe}.json`);
}

/**
 * Load a user profile. Returns null if not found.
 */
function loadProfile(phone) {
  const filePath = profilePath(phone);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Failed to parse profile', { phone, error: err.message });
    return null;
  }
}

/**
 * Save (create or overwrite) a user profile.
 */
function saveProfile(phone, data) {
  const filePath = profilePath(phone);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.debug('Profile saved', { phone });
  } catch (err) {
    logger.error('Failed to save profile', { phone, error: err.message });
    throw err;
  }
}

/**
 * Create a new blank profile for a phone number.
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
 * Update specific fields on a profile (shallow merge at top level).
 */
function updateProfile(phone, updates) {
  const existing = loadProfile(phone) || createProfile(phone);
  const updated = {
    ...existing,
    ...updates,
    last_active: new Date().toISOString()
  };
  saveProfile(phone, updated);
  return updated;
}

/**
 * Return all profiles with cron_active = true.
 */
function getAllActiveUsers() {
  if (!fs.existsSync(USERS_DIR)) return [];

  const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json'));
  const users = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(USERS_DIR, file), 'utf8');
      const profile = JSON.parse(raw);
      if (profile.cron_active && profile.onboarding_complete) {
        users.push(profile);
      }
    } catch (err) {
      logger.warn('Skipping corrupt profile file', { file, error: err.message });
    }
  }

  return users;
}

/**
 * Return all profiles (for admin use).
 */
function getAllUsers() {
  if (!fs.existsSync(USERS_DIR)) return [];

  const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json'));
  const users = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(USERS_DIR, file), 'utf8');
      users.push(JSON.parse(raw));
    } catch {
      // skip corrupt files
    }
  }

  return users;
}

module.exports = {
  loadProfile,
  saveProfile,
  createProfile,
  updateProfile,
  getAllActiveUsers,
  getAllUsers
};
