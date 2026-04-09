'use strict';

const { loadProfile, updateProfile } = require('../handlers/profileLoader');

// In-memory state (fast reads). Persisted to user profile on writes
// so server restarts don't lose state.
// State shapes:
//   { step: 'idle' }
//   { step: 'onboarding', onboarding_step: N }
//   { step: 'awaiting_checkin_response' }
//   { step: 'awaiting_challenge_detail' }

const _states = {};

/**
 * Get current session state for a user.
 * Falls back to profile's session_state if not in memory.
 */
function getState(phone) {
  if (_states[phone]) return _states[phone];

  const profile = loadProfile(phone);
  if (!profile) return { step: 'new' };

  if (!profile.onboarding_complete) {
    return { step: 'onboarding', onboarding_step: profile.onboarding_step || 0 };
  }

  return { step: profile.session_state || 'idle' };
}

/**
 * Set session state in memory and persist step to profile.
 */
function setState(phone, state) {
  _states[phone] = state;

  // Persist session_state string to profile
  const sessionStateStr = state.step || 'idle';
  updateProfile(phone, { session_state: sessionStateStr });
}

/**
 * Reset to idle.
 */
function clearState(phone) {
  _states[phone] = { step: 'idle' };
  updateProfile(phone, { session_state: 'idle' });
}

module.exports = { getState, setState, clearState };
