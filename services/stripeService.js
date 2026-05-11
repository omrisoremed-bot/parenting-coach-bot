'use strict';

/**
 * stripeService.js — Wrapper Stripe pour ParentAtEase.
 *
 * Architecture :
 *   - 2 tiers payants (family, atelier) × 2 cadences (monthly, yearly)
 *   - Essai gratuit 7 jours (trial_period_days, configurable via STRIPE_TRIAL_DAYS)
 *   - Customer Portal pour cancel/upgrade/payment-method (lien Stripe-hosted)
 *   - Webhook signature vérifiée via STRIPE_WEBHOOK_SECRET
 *
 * Initialisation paresseuse : si STRIPE_SECRET_KEY absent, le module renvoie
 * { available: false } sur tous les appels — utile en dev sans creds.
 */

const logger = require('./logger');

let _stripe = null;
let _enabled = null;

function isEnabled() {
  if (_enabled !== null) return _enabled;
  _enabled = !!process.env.STRIPE_SECRET_KEY;
  if (_enabled) {
    logger.info('Stripe service initialized', {
      trialDays: parseInt(process.env.STRIPE_TRIAL_DAYS || '7', 10),
      mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST',
    });
  } else {
    logger.info('Stripe service DISABLED (STRIPE_SECRET_KEY not set)');
  }
  return _enabled;
}

function getClient() {
  if (!isEnabled()) return null;
  if (!_stripe) {
    const Stripe = require('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return _stripe;
}

// ─── Plan resolution ─────────────────────────────────────────────────────────
const PLAN_MAP = {
  family_monthly:  () => process.env.STRIPE_PRICE_FAMILY_MONTHLY,
  family_yearly:   () => process.env.STRIPE_PRICE_FAMILY_YEARLY,
  atelier_monthly: () => process.env.STRIPE_PRICE_ATELIER_MONTHLY,
  atelier_yearly:  () => process.env.STRIPE_PRICE_ATELIER_YEARLY,
};

function getPriceId(plan) {
  const fn = PLAN_MAP[plan];
  return fn ? fn() : null;
}

function tierFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_PRICE_FAMILY_MONTHLY)  return 'family';
  if (priceId === process.env.STRIPE_PRICE_FAMILY_YEARLY)   return 'family';
  if (priceId === process.env.STRIPE_PRICE_ATELIER_MONTHLY) return 'atelier';
  if (priceId === process.env.STRIPE_PRICE_ATELIER_YEARLY)  return 'atelier';
  return null;
}

// ─── Create Checkout Session ─────────────────────────────────────────────────
/**
 * @param {string} phone        — user identifier (E.164 or 'tg:<chat_id>')
 * @param {string} plan         — one of: family_monthly | family_yearly | atelier_monthly | atelier_yearly
 * @param {string} email        — for receipts (optional but recommended)
 * @param {string} customerId   — existing Stripe customer (optional)
 * @returns {Promise<{url: string, sessionId: string}>}
 */
async function createCheckoutSession({ phone, plan, email, customerId }) {
  if (!isEnabled()) throw new Error('Stripe not configured');

  const priceId = getPriceId(plan);
  if (!priceId) throw new Error(`Unknown plan: ${plan}`);

  const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '7', 10);
  const successUrl = process.env.STRIPE_SUCCESS_URL || 'https://parentatease.com/?subscribed=1';
  const cancelUrl  = process.env.STRIPE_CANCEL_URL  || 'https://parentatease.com/?canceled=1';

  const session = await getClient().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { phone, plan },
    },
    metadata: { phone, plan },
    success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  cancelUrl,
    customer:        customerId || undefined,
    customer_email:  customerId ? undefined : email,
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    billing_address_collection: 'auto',
    locale: 'auto',
  });

  return { url: session.url, sessionId: session.id };
}

// ─── Customer Portal session ─────────────────────────────────────────────────
async function createPortalSession({ customerId, returnUrl }) {
  if (!isEnabled()) throw new Error('Stripe not configured');
  const session = await getClient().billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl || process.env.STRIPE_SUCCESS_URL || 'https://parentatease.com/',
  });
  return { url: session.url };
}

// ─── Verify webhook signature ────────────────────────────────────────────────
function verifyWebhookSignature(rawBody, sig) {
  if (!isEnabled()) throw new Error('Stripe not configured');
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET missing — refusing to process webhook');
  }
  return getClient().webhooks.constructEvent(
    rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

// ─── Fetch subscription details (used after webhook to enrich DB) ───────────
async function retrieveSubscription(subscriptionId) {
  if (!isEnabled()) return null;
  return getClient().subscriptions.retrieve(subscriptionId);
}

async function retrieveCustomer(customerId) {
  if (!isEnabled()) return null;
  return getClient().customers.retrieve(customerId);
}

module.exports = {
  isEnabled,
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature,
  retrieveSubscription,
  retrieveCustomer,
  tierFromPriceId,
  getPriceId,
};
