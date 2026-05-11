'use strict';

/**
 * leadsHandler.js — Lead magnet form + 3-email sequence dispatcher.
 *
 * Routes :
 *   POST /api/leads               body: { email, first_name?, lang?, source? }
 *                                 → register lead + send day0 email (PDF link)
 *   GET  /api/leads/unsubscribe   query: ?email=...&token=...
 *                                 → mark unsubscribed
 *
 * Cron (separate, in cron/index.js) :
 *   Twice daily at 10h00 — dispatch day3 + day7 emails to eligible leads
 */

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const logger  = require('../services/logger');
const email   = require('../services/emailService');
const {
  upsertLead, findLeadsToSend, markLeadSent, unsubscribeLead, getDb,
} = require('../services/database');

// ─── Public URLs ─────────────────────────────────────────────────────────────
const PUBLIC_URL    = process.env.WEBAPP_PUBLIC_URL || 'https://parentatease.com';
const PDF_URL       = `${PUBLIC_URL}/leadmagnets/50-phrases-qui-apaisent.html`;
const UNSUB_SECRET  = process.env.UNSUB_SECRET || process.env.ADMIN_TOKEN || 'change-me-please';

function unsubToken(email) {
  return crypto.createHmac('sha256', UNSUB_SECRET).update(email.toLowerCase()).digest('hex').slice(0, 16);
}
function unsubLink(email) {
  return `${PUBLIC_URL}/api/leads/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
}

// ─── Rate limit form submissions (10/h per IP) ───────────────────────────────
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Réessaie dans 1 heure.' },
});

// ─── POST /api/leads — register a new lead ───────────────────────────────────
router.post('/', formLimiter, async (req, res) => {
  const { email: rawEmail, first_name, lang, source } = req.body || {};

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const cleanEmail = rawEmail.toLowerCase().trim();
  const cleanLang  = ['fr', 'en', 'es', 'pt', 'ar'].includes(lang) ? lang : 'fr';

  try {
    upsertLead({
      email:      cleanEmail,
      first_name: (first_name || '').slice(0, 50) || null,
      lang:       cleanLang,
      source:     source || '50-phrases',
      ip:         req.ip,
      user_agent: (req.headers['user-agent'] || '').slice(0, 200),
    });

    // Fire-and-forget day0 send (don't block the response)
    sendDay0(cleanEmail, first_name, cleanLang).catch(err =>
      logger.error('day0 send failed', { email: cleanEmail, error: err.message })
    );

    res.json({ ok: true, message: 'Check ton email dans 1-2 minutes 📬' });
  } catch (err) {
    logger.error('lead upsert failed', { email: cleanEmail, error: err.message });
    res.status(500).json({ error: 'server_error' });
  }
});

// ─── GET /api/leads/unsubscribe ──────────────────────────────────────────────
router.get('/unsubscribe', (req, res) => {
  const { email: rawEmail, token } = req.query;
  if (!rawEmail || !token) return res.status(400).send('Missing parameters');

  const expected = unsubToken(rawEmail);
  if (token !== expected) return res.status(403).send('Invalid token');

  try {
    unsubscribeLead(rawEmail);
    res.set('Content-Type', 'text/html; charset=utf-8').send(`
      <!doctype html><html><head><meta charset="utf-8"><title>Désabonnement</title>
      <style>body{font-family:system-ui,sans-serif;max-width:520px;margin:5rem auto;padding:0 1rem;text-align:center;color:#2D3047}h1{font-size:1.8rem}</style>
      </head><body>
      <h1>👋 Tu es désabonné·e</h1>
      <p>On ne t'enverra plus rien. Aucun souci, et bonne route.</p>
      <p style="margin-top:2rem"><a href="${PUBLIC_URL}">Retour à parentatease.com</a></p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send('Erreur, contacte-nous : hello@parentatease.com');
  }
});

// ─── Email templates (FR — MVP) ──────────────────────────────────────────────
const TEMPLATES = {
  fr: {
    day0: (firstName, unsub) => ({
      subject: `📖 ${firstName ? firstName + ', ton ' : 'Ton '}guide « 50 phrases qui apaisent »`,
      html: render(`
<p>Bonjour ${firstName || ''} 👋</p>
<p>Voilà ton guide, comme promis :</p>
<p style="text-align:center;margin:2rem 0">
  <a href="${PDF_URL}" style="background:#FFC93C;color:#2D3047;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">📖 Lire les 50 phrases</a>
</p>
<p>Tu peux le lire en ligne ou cliquer sur <em>« Enregistrer en PDF »</em> en haut de la page pour le télécharger et l'afficher sur ton frigo.</p>
<p>Une chose avant que tu commences : <strong>tu n'as pas à apprendre les 50 phrases</strong>. Choisis-en 2 ou 3 par catégorie qui te ressemblent. La prochaine crise, tu auras les mots prêts.</p>
<p>On se reparle dans 3 jours, avec un focus sur les crises de colère.</p>
<p>Belle journée,<br>L'équipe ParentAtEase</p>
<hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
<p style="font-size:.85rem;color:#888">PS — Si jamais tu n'as pas demandé ce guide, <a href="${unsub}">désabonne-toi en 1 clic</a>. Et désolé pour le dérangement.</p>
      `),
    }),
    day3: (firstName, unsub) => ({
      subject: '🔥 Le piège dans lequel tombent 90% des parents (en crise)',
      html: render(`
<p>Salut ${firstName || ''} 👋</p>
<p>Question rapide : quand ton enfant est en pleine crise, qu'est-ce que tu dis en premier ?</p>
<p>Si c'est <em>« Calme-toi »</em>, <em>« Arrête »</em>, ou <em>« C'est rien »</em>… c'est normal. C'est ce que 90% des parents disent. <strong>Et c'est ce qui prolonge la crise.</strong></p>
<p>La science est claire : pendant une crise, le cortex préfrontal de l'enfant est <strong>déconnecté</strong>. Lui demander de raisonner, c'est comme demander à quelqu'un qui se noie de respirer normalement.</p>
<p>Ce qui marche : <strong>connecter avant de corriger</strong>.</p>
<p>Une phrase comme <em>« Tu as le droit d'être en colère. Je suis là. »</em> active immédiatement le système d'attachement et fait baisser le cortisol en 90 secondes.</p>
<p>Tu retrouves toutes les phrases pour cet âge dans <a href="${PDF_URL}">la section 1 du guide</a>.</p>
<p>Dis-moi : quelle phrase tu as testée ? Réponds à cet email, je lis tout.</p>
<p>Belle journée,<br>L'équipe ParentAtEase</p>
<hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
<p style="font-size:.85rem;color:#888">Désabonnement <a href="${unsub}">ici</a></p>
      `),
    }),
    day7: (firstName, unsub) => ({
      subject: 'Et si tu avais la bonne phrase, à chaque crise ? 🌿',
      html: render(`
<p>Salut ${firstName || ''} 👋</p>
<p>Tu te souviens du guide « 50 phrases qui apaisent » qu'on t'a envoyé il y a quelques jours ?</p>
<p>Plein de parents nous écrivent : <em>« C'est génial, mais sur le moment, je ne me souviens jamais de la bonne phrase. »</em></p>
<p>C'est normal. Le cerveau parental sous stress fait pareil que celui de l'enfant : il bug.</p>
<p>C'est exactement pour ça qu'on a construit <strong>ParentAtEase</strong>.</p>
<p>Tu envoies un message sur WhatsApp à 22h, depuis la chambre de ton enfant qui pleure :</p>
<p style="background:#FFF1D6;padding:1rem;border-radius:12px;font-style:italic;color:#5C5F7C">
« Yassine, 3 ans, refuse d'aller au lit. Je suis épuisée. »
</p>
<p>En 6 secondes, tu reçois :</p>
<ol>
  <li>La phrase exacte à dire <strong>maintenant</strong></li>
  <li>Pourquoi ça va marcher pour TON enfant (basé sur le profil)</li>
  <li>Une mini-stratégie pour les 10 prochaines minutes</li>
</ol>
<p>Pas une appli à télécharger. Pas un livre à lire. Juste WhatsApp, comme une amie qui sait.</p>
<p style="text-align:center;margin:2rem 0">
  <a href="${PUBLIC_URL}" style="background:#FF6B9D;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Essayer 7 jours gratuit →</a>
</p>
<p>Pas de carte coupée pendant l'essai. Annulable en 1 clic.</p>
<p>Belle journée,<br>L'équipe ParentAtEase</p>
<hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
<p style="font-size:.85rem;color:#888">C'est notre dernier email automatique. Si tu n'as rien fait, c'est OK — on ne t'embête plus. <a href="${unsub}">Désabonnement</a></p>
      `),
    }),
  },
};

function render(inner) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;color:#2D3047;line-height:1.6;font-size:16px">${inner}</body></html>`;
}

// ─── Send helpers (called by route handler + cron) ──────────────────────────
async function sendDay0(emailAddr, firstName, lang = 'fr') {
  if (!email.isEnabled()) {
    logger.warn('day0 skip — email service disabled', { email: emailAddr });
    return;
  }
  const t = (TEMPLATES[lang] || TEMPLATES.fr).day0(firstName, unsubLink(emailAddr));
  const result = await email.sendEmail({
    to: emailAddr, subject: t.subject, html: t.html, tags: ['leadmagnet', 'day0', lang],
  });
  if (!result.error) markLeadSent(emailAddr, 'day0');
}

async function sendDay3(emailAddr, firstName, lang = 'fr') {
  if (!email.isEnabled()) return;
  const t = (TEMPLATES[lang] || TEMPLATES.fr).day3(firstName, unsubLink(emailAddr));
  const result = await email.sendEmail({
    to: emailAddr, subject: t.subject, html: t.html, tags: ['leadmagnet', 'day3', lang],
  });
  if (!result.error) markLeadSent(emailAddr, 'day3');
}

async function sendDay7(emailAddr, firstName, lang = 'fr') {
  if (!email.isEnabled()) return;
  const t = (TEMPLATES[lang] || TEMPLATES.fr).day7(firstName, unsubLink(emailAddr));
  const result = await email.sendEmail({
    to: emailAddr, subject: t.subject, html: t.html, tags: ['leadmagnet', 'day7', lang],
  });
  if (!result.error) markLeadSent(emailAddr, 'day7');
}

// ─── Cron-friendly dispatcher (called from cron/index.js) ──────────────────
async function dispatchPendingEmails() {
  if (!email.isEnabled()) return;

  for (const stage of ['day3', 'day7']) {
    const leads = findLeadsToSend(stage);
    logger.info(`leadmagnet ${stage} batch`, { count: leads.length });
    for (const lead of leads) {
      try {
        const fn = stage === 'day3' ? sendDay3 : sendDay7;
        await fn(lead.email, lead.first_name, lead.lang);
        await new Promise(r => setTimeout(r, 200)); // gentle pacing for Resend
      } catch (err) {
        logger.error(`leadmagnet ${stage} send failed`, { email: lead.email, error: err.message });
      }
    }
  }
}

module.exports = router;
module.exports.dispatchPendingEmails = dispatchPendingEmails;
module.exports.sendDay0 = sendDay0;
