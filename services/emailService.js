'use strict';

/**
 * emailService.js — Wrapper Resend pour les emails transactionnels.
 *
 * Resend (https://resend.com) : 3 000 emails/mois gratuits, région EU,
 * API simple, livraison fiable, DKIM/SPF auto si domaine vérifié.
 *
 * Idle silencieux si RESEND_API_KEY absent.
 *
 * API publique :
 *   sendEmail({ to, subject, html, text, replyTo, tags })
 *   isEnabled()
 */

const logger = require('./logger');

let _resend  = null;
let _enabled = null;

function isEnabled() {
  if (_enabled !== null) return _enabled;
  _enabled = !!process.env.RESEND_API_KEY;
  if (_enabled) {
    logger.info('Email service initialized (Resend)', {
      from: process.env.RESEND_FROM || 'ParentAtEase <noreply@parentatease.com>',
    });
  } else {
    logger.info('Email service DISABLED (RESEND_API_KEY not set)');
  }
  return _enabled;
}

function getClient() {
  if (!isEnabled()) return null;
  if (!_resend) {
    const { Resend } = require('resend');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Envoie un email transactionnel via Resend.
 * @param {Object} opts
 * @param {string|string[]} opts.to    — destinataire(s)
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]         — version texte (recommandé)
 * @param {string} [opts.replyTo]
 * @param {string[]} [opts.tags]       — labels pour analytics
 * @returns {Promise<{id: string} | {error: string}>}
 */
async function sendEmail({ to, subject, html, text, replyTo, tags }) {
  if (!isEnabled()) {
    logger.warn('sendEmail called but service disabled', { to, subject });
    return { error: 'email_service_disabled' };
  }

  const from = process.env.RESEND_FROM || 'ParentAtEase <noreply@parentatease.com>';

  try {
    const result = await getClient().emails.send({
      from,
      to:        Array.isArray(to) ? to : [to],
      subject,
      html:      html || `<p>${text || ''}</p>`,
      text:      text || stripTags(html || ''),
      reply_to:  replyTo,
      tags:      (tags || []).map(t => ({ name: 'category', value: t })),
    });

    if (result.error) {
      logger.error('Resend send failed', { to, subject, error: result.error });
      return { error: result.error.message || 'send_failed' };
    }

    logger.info('Email sent', { id: result.data?.id, to, subject });
    return { id: result.data?.id };
  } catch (err) {
    logger.error('Resend exception', { to, subject, error: err.message });
    return { error: err.message };
  }
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = { isEnabled, sendEmail };
