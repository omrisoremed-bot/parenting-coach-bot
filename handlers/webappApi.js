'use strict';

/**
 * webappApi.js — API REST pour la webapp parent (Phase 2 v1)
 *
 * Endpoints :
 *   POST /api/auth/request-otp   { phone }                → envoie un code via messengerAdapter
 *   POST /api/auth/verify-otp    { phone, code }          → renvoie { token, expiresAt }
 *   POST /api/auth/logout                                 → invalide la session
 *   GET  /api/me                                          → profil utilisateur (auth)
 *   GET  /api/history?limit=20                            → historique conversation_history (auth)
 *
 * Auth : header `Authorization: Bearer <token>`
 *
 * L'ID `phone` peut être :
 *   - `+212XXXXXXXXX` (WhatsApp)
 *   - `tg:<chat_id>` (Telegram)
 * Le bot envoie l'OTP via le canal correspondant grâce à `messengerAdapter`.
 */

const express = require('express');
const crypto  = require('crypto');
const { getDb } = require('../services/database');
const { loadProfile } = require('./profileLoader');
const { sendMessage } = require('../services/messengerAdapter');
const logger = require('../services/logger');

const router = express.Router();
router.use(express.json());

const OTP_TTL_MS      = 5 * 60 * 1000;         // 5 min
const SESSION_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 jours
const OTP_RATE_LIMIT_MS = 30 * 1000;           // 1 OTP toutes les 30s max

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateOTP() {
  // 6 chiffres avec zéros en tête
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // WhatsApp (E.164) ou Telegram (tg:<id>)
  if (trimmed.startsWith('tg:')) return trimmed;
  // Auto-add + si l'utilisateur a tapé sans
  if (/^\d{8,15}$/.test(trimmed)) return '+' + trimmed;
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(ms) {
  return new Date(Date.now() + ms).toISOString();
}

// ─── Middleware auth ─────────────────────────────────────────────────────────
function requireSession(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const db = getDb();
  const row = db.prepare('SELECT phone, expires_at FROM sessions WHERE token = ?').get(token);

  if (!row) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'expired_token' });
  }

  req.session = { token, phone: row.phone };
  next();
}

// ─── POST /api/auth/request-otp ──────────────────────────────────────────────
router.post('/auth/request-otp', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ error: 'invalid_phone' });
  }

  // Le user doit exister (on ne crée PAS de profil via la webapp — on s'inscrit d'abord sur le bot)
  const profile = loadProfile(phone);
  if (!profile) {
    return res.status(404).json({
      error: 'user_not_found',
      message: "Commence par envoyer 'Bonjour' au bot WhatsApp ou Telegram pour créer ton compte."
    });
  }

  const db = getDb();

  // Rate limit : un OTP toutes les 30s par numéro
  const recent = db
    .prepare(`SELECT created_at FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1`)
    .get(phone);
  if (recent && Date.now() - new Date(recent.created_at).getTime() < OTP_RATE_LIMIT_MS) {
    return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 30 });
  }

  // Purge OTPs expirés pour ce numéro
  db.prepare(`DELETE FROM otp_codes WHERE phone = ? AND expires_at < datetime('now')`).run(phone);

  const code = generateOTP();
  const expiresAt = futureIso(OTP_TTL_MS);

  db.prepare(
    `INSERT INTO otp_codes (phone, code, created_at, expires_at, used)
     VALUES (?, ?, ?, ?, 0)`
  ).run(phone, code, nowIso(), expiresAt);

  // Envoi via le canal du user (WhatsApp ou Telegram)
  const lang = profile.language || 'fr';
  const messages = {
    fr: `🔐 Ton code de connexion ParentEase : *${code}*\n\nValide 5 minutes. Ne le partage avec personne.`,
    en: `🔐 Your ParentEase login code: *${code}*\n\nValid for 5 minutes. Do not share it.`,
    es: `🔐 Tu código de acceso ParentEase: *${code}*\n\nVálido 5 minutos. No lo compartas.`,
    pt: `🔐 Teu código de acesso ParentEase: *${code}*\n\nVálido 5 minutos. Não partilhes.`,
    ar: `🔐 رمز الدخول الخاص بك ParentEase: *${code}*\n\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`
  };
  try {
    await sendMessage(phone, messages[lang] || messages.fr);
  } catch (err) {
    logger.error('OTP send failed', { phone, error: err.message });
    return res.status(502).json({ error: 'send_failed' });
  }

  logger.info('OTP requested', { phone });
  return res.json({ ok: true, expires_at: expiresAt });
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
router.post('/auth/verify-otp', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT code, expires_at, used FROM otp_codes
       WHERE phone = ? AND code = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(phone, code);

  if (!row) return res.status(401).json({ error: 'invalid_code' });
  if (row.used) return res.status(401).json({ error: 'code_already_used' });
  if (new Date(row.expires_at) < new Date()) return res.status(401).json({ error: 'code_expired' });

  // Mark used
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE phone = ? AND code = ?`).run(phone, code);

  // Create session
  const token = generateSessionToken();
  const expiresAt = futureIso(SESSION_TTL_MS);
  db.prepare(
    `INSERT INTO sessions (token, phone, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(token, phone, nowIso(), expiresAt);

  logger.info('Session created', { phone });
  return res.json({ token, expires_at: expiresAt });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/auth/logout', requireSession, (req, res) => {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(req.session.token);
  return res.json({ ok: true });
});

// ─── GET /api/me ─────────────────────────────────────────────────────────────
router.get('/me', requireSession, (req, res) => {
  const profile = loadProfile(req.session.phone);
  if (!profile) return res.status(404).json({ error: 'profile_not_found' });

  // Expose un sous-ensemble safe (pas de champs internes)
  return res.json({
    phone: profile.phone,
    channel: profile.phone.startsWith('tg:') ? 'telegram' : 'whatsapp',
    language: profile.language,
    parent: profile.parent || {},
    children: profile.children || [],
    challenges: profile.challenges || [],
    parenting_style: profile.parenting_style || '',
    cultural_context: profile.cultural_context || '',
    cron_active: !!profile.cron_active,
    onboarding_complete: !!profile.onboarding_complete,
    created_at: profile.created_at,
    last_active: profile.last_active,
    weekly_checkins: profile.weekly_checkins || []
  });
});

// ─── GET /api/history ────────────────────────────────────────────────────────
router.get('/history', requireSession, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT role, content, created_at FROM conversation_history
       WHERE phone = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(req.session.phone, limit);
  return res.json({ messages: rows.reverse() });
});

module.exports = router;
