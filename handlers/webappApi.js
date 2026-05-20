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

const express   = require('express');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');
const { getDb, logMessage } = require('../services/database');
const { loadProfile, updateProfile } = require('./profileLoader');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI, buildConversationPrompt, narrateProfile } = require('../services/aiService');
const { systemPrompt } = require('../services/promptBuilder');

// 5 styles de réponse exposés par /api/response-variants. Modifiable en un seul
// endroit — le frontend les consomme via la réponse (ne fait pas d'hypothèse
// sur la liste). Si tu veux ajouter "ferme-doux", ajoute juste une ligne.
const RESPONSE_STYLES = [
  { slug: 'calme',      label: 'Calme',       description: 'Accueille l\'émotion, voix douce, valide avant tout. Pas de leçon.' },
  { slug: 'ferme',      label: 'Ferme',       description: 'Limite claire, voix posée, sans crier ni menacer. Une seule consigne.' },
  { slug: 'montessori', label: 'Montessori',  description: 'Autonomie, choix limité, respect de la dignité de l\'enfant.' },
  { slug: 'psy',        label: 'Psychologue', description: 'Nomme l\'émotion, reconnaît le besoin sous-jacent, reconnecte.' },
  { slug: 'public',     label: 'En public',   description: 'Brève, neutre, garde la face de l\'enfant. Pas de spectacle.' }
];

/**
 * Parse les variantes depuis la sortie LLM. Robuste aux fences markdown,
 * au texte avant/après le JSON, et au reflection block qui aurait échappé
 * au strip. Retourne un tableau aligné sur RESPONSE_STYLES — entrées
 * manquantes = chaîne vide (le client affiche un fallback).
 */
function parseVariantsResponse(reply, styles) {
  if (!reply) return styles.map(s => ({ ...s, text: '' }));
  const cleaned = reply.replace(/```(?:json)?/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : cleaned;
  let obj = null;
  try { obj = JSON.parse(jsonStr); } catch { obj = null; }
  return styles.map(s => ({
    style: s.slug,
    label: s.label,
    text:  (obj && typeof obj[s.slug] === 'string' ? obj[s.slug] : '').trim()
  }));
}
const logger = require('../services/logger');

const router = express.Router();
router.use(express.json());

const OTP_TTL_MS      = 5 * 60 * 1000;         // 5 min
const SESSION_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 jours
const OTP_RATE_LIMIT_MS = 30 * 1000;           // 1 OTP toutes les 30s max
const CHAT_HISTORY_TURNS = 6;                  // tours injectés dans le contexte IA
const CHAT_MAX_CHARS     = 2000;               // limite anti-abus sur un message

// ─── Rate limit chat — 30 messages / 5 min par IP (protège le quota IA) ──────
const chatLimiter = rateLimit({
  windowMs:        5 * 60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'rate_limited', retry_after_minutes: 5 }
});

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

  // Telegram IDs — format interne "tg:<chat_id>"
  if (trimmed.startsWith('tg:')) return trimmed;

  // WhatsApp — format E.164 strict avec "+" obligatoire
  // On n'auto-complète PAS les numéros locaux (ex: 0612... → +0612... invalide)
  // L'UI doit guider l'utilisateur vers le format +212XXXXXXXXX
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;

  // Tentative de normalisation basique : "00" → "+"
  const via00 = trimmed.replace(/^00/, '+');
  if (/^\+\d{8,15}$/.test(via00)) return via00;

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
    return res.status(400).json({
      error: 'invalid_phone',
      message: 'Format invalide. Utilise le format international : +212XXXXXXXXX (WhatsApp) ou tg:<id> (Telegram).'
    });
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

// ─── POST /api/chat — conversation libre avec le coach IA ────────────────────
// Réplique la logique free-form du bot (handlers/messageHandler.js) mais
// retourne la réponse au lieu de l'envoyer via WhatsApp/Telegram. Les messages
// sont tracés dans conversation_history → visibles aussi via GET /api/history
// et partagés avec le canal bot (historique unifié multi-canal).
router.post('/chat', chatLimiter, requireSession, async (req, res) => {
  const text = String(req.body?.text || '').trim();

  if (!text) {
    return res.status(400).json({ error: 'empty_message' });
  }
  if (text.length > CHAT_MAX_CHARS) {
    return res.status(400).json({ error: 'message_too_long', max_chars: CHAT_MAX_CHARS });
  }

  const phone   = req.session.phone;
  const profile = loadProfile(phone);
  if (!profile) {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  try {
    logMessage(phone, 'user', text);

    // Contexte : derniers échanges (user + assistant)
    let history = [];
    try {
      const rows = getDb()
        .prepare(
          `SELECT role, content FROM conversation_history
           WHERE phone = ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(phone, CHAT_HISTORY_TURNS * 2)
        .reverse();
      history = rows.map(r => ({ role: r.role, content: r.content }));
    } catch (histErr) {
      logger.warn('chat history fetch failed — responding without context', {
        phone, error: histErr.message
      });
    }

    const prompt = buildConversationPrompt(profile, text);
    const reply  = await callAI(systemPrompt, prompt, history);
    logMessage(phone, 'assistant', reply);

    return res.json({ reply });
  } catch (err) {
    logger.error('chat endpoint error', { phone, error: err.message });
    return res.status(502).json({ error: 'ai_unavailable' });
  }
});

// ─── POST /api/response-variants — 5 façons de répondre à une situation ─────
// Reçoit une situation libre, retourne 5 réponses dans 5 styles distincts.
// 1 appel IA, parsing JSON robuste, fallback texte vide si parsing échoue.
router.post('/response-variants', chatLimiter, requireSession, async (req, res) => {
  const situation = String(req.body?.situation || '').trim();
  if (!situation) {
    return res.status(400).json({ error: 'empty_situation' });
  }
  if (situation.length > 1000) {
    return res.status(400).json({ error: 'situation_too_long', max_chars: 1000 });
  }

  const phone   = req.session.phone;
  const profile = loadProfile(phone);
  if (!profile) return res.status(404).json({ error: 'profile_not_found' });

  const profileNarr = narrateProfile(profile);
  const stylesBlock = RESPONSE_STYLES
    .map(s => `- "${s.slug}" → ${s.description}`)
    .join('\n');

  const prompt = `
Parent : ${profileNarr}

Situation rapportée par le parent : « ${situation} »

Génère 5 versions différentes de ce que le parent peut DIRE À SON ENFANT dans
cette situation, chacune dans un style distinct. Sois bref : 1 à 2 phrases
par variante, max 220 caractères. Utilise le prénom de l'enfant. Évite tout
discours sur le parent (« je suis là pour toi » non, parle À l'enfant).

Styles à produire (clés JSON) :
${stylesBlock}

Réponds UNIQUEMENT par un objet JSON strict, sans aucun texte hors du JSON,
sans bloc <reflection>, sans commentaires :
{
  "calme":      "...",
  "ferme":      "...",
  "montessori": "...",
  "psy":        "...",
  "public":     "..."
}
Langue : ${profile.language || 'fr'}.
  `.trim();

  try {
    const reply    = await callAI(systemPrompt, prompt);
    const variants = parseVariantsResponse(reply, RESPONSE_STYLES);
    const filled   = variants.filter(v => v.text).length;
    if (filled === 0) {
      logger.warn('variants parse yielded zero filled entries', { phone, replyHead: reply.slice(0, 200) });
      return res.status(502).json({ error: 'parse_failed' });
    }
    logger.info('variants generated', { phone, filled });
    return res.json({ variants });
  } catch (err) {
    logger.error('variants endpoint error', { phone, error: err.message });
    return res.status(502).json({ error: 'ai_unavailable' });
  }
});

// ─── POST /api/scenario-guidance — adapte un scénario au profil du parent ───
// Reçoit le titre + la base générique d'un scénario, retourne une version
// personnalisée pour l'enfant spécifique (âge, tempérament, besoins, culture).
router.post('/scenario-guidance', chatLimiter, requireSession, async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const base  = String(req.body?.base  || '').trim();

  if (!title) return res.status(400).json({ error: 'missing_title' });
  if (title.length > 200 || base.length > 4000) {
    return res.status(400).json({ error: 'too_long' });
  }

  const phone   = req.session.phone;
  const profile = loadProfile(phone);
  if (!profile) return res.status(404).json({ error: 'profile_not_found' });

  const prompt = `
Parent : ${narrateProfile(profile)}

Scénario : ${title}

Base générique (référence) :
${base}

Réécris cette guidance en l'adaptant spécifiquement à CE parent et à son
enfant : utilise le prénom de l'enfant, l'âge exact, son tempérament, ses
besoins spéciaux, les défis déclarés et le contexte culturel/religieux.
Reproduis le ton des exemples de SOUL.md.

Format : une phrase d'ouverture nominative qui reconnaît la situation, puis
3 à 5 conseils en puces courtes adaptés au profil. Max 220 mots.
Astérisques *gras* WhatsApp uniquement, pas de markdown complexe.
N'oublie pas le bloc <reflection>...</reflection> avant le message visible.
Langue : ${profile.language || 'fr'}.
  `.trim();

  try {
    const guidance = await callAI(systemPrompt, prompt);
    return res.json({ guidance });
  } catch (err) {
    logger.error('scenario-guidance error', { phone, error: err.message });
    return res.status(502).json({ error: 'ai_unavailable' });
  }
});

// ─── POST /api/me/cron-toggle — activer/suspendre les messages auto ──────────
router.post('/me/cron-toggle', requireSession, (req, res) => {
  const active = req.body?.active;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'invalid_input', message: 'active doit être un booléen' });
  }

  const profile = loadProfile(req.session.phone);
  if (!profile) return res.status(404).json({ error: 'profile_not_found' });

  const updated = updateProfile(req.session.phone, { cron_active: active });
  logger.info('Cron toggled via app', { phone: req.session.phone, active });
  return res.json({ cron_active: !!updated.cron_active });
});

// ─── PATCH /api/me — édition du profil par l'utilisateur (champs whitelistés) ─
const USER_EDITABLE_FIELDS = [
  'language', 'parent', 'children', 'challenges',
  'parenting_style', 'cultural_context'
];

router.patch('/me', requireSession, (req, res) => {
  const existing = loadProfile(req.session.phone);
  if (!existing) return res.status(404).json({ error: 'profile_not_found' });

  const patch = Object.fromEntries(
    Object.entries(req.body || {}).filter(([k]) => USER_EDITABLE_FIELDS.includes(k))
  );
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'no_valid_fields', allowed: USER_EDITABLE_FIELDS });
  }

  const updated = updateProfile(req.session.phone, patch);
  logger.info('Profile updated via app', { phone: req.session.phone, fields: Object.keys(patch) });

  return res.json({
    phone: updated.phone,
    channel: updated.phone.startsWith('tg:') ? 'telegram' : 'whatsapp',
    language: updated.language,
    parent: updated.parent || {},
    children: updated.children || [],
    challenges: updated.challenges || [],
    parenting_style: updated.parenting_style || '',
    cultural_context: updated.cultural_context || '',
    cron_active: !!updated.cron_active,
    onboarding_complete: !!updated.onboarding_complete,
    created_at: updated.created_at,
    last_active: updated.last_active,
    weekly_checkins: updated.weekly_checkins || []
  });
});

// ─── POST /api/push/register — enregistre le jeton push Expo de l'appareil ────
router.post('/push/register', requireSession, (req, res) => {
  const token    = String(req.body?.token || '').trim();
  const platform = String(req.body?.platform || 'unknown').trim().slice(0, 20);

  if (!token) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  try {
    getDb().prepare(
      `INSERT INTO push_tokens (token, phone, platform, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(token) DO UPDATE SET
         phone = excluded.phone,
         platform = excluded.platform,
         updated_at = datetime('now')`
    ).run(token, req.session.phone, platform);
    logger.info('Push token registered', { phone: req.session.phone, platform });
    return res.json({ ok: true });
  } catch (err) {
    logger.error('push register failed', { phone: req.session.phone, error: err.message });
    return res.status(500).json({ error: 'register_failed' });
  }
});

module.exports = router;
