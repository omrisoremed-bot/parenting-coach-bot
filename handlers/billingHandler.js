'use strict';

/**
 * billingHandler.js — Stripe Checkout + Customer Portal + Webhook.
 *
 * Routes :
 *   POST /api/billing/checkout      → returns Stripe Checkout URL (auth required)
 *   POST /api/billing/portal        → returns Customer Portal URL (auth required)
 *   POST /api/billing/webhook       → Stripe webhook (no auth, signature-verified)
 *
 * Wired in bot.js as :
 *   app.use('/api/billing', billingRouter);
 * with /webhook receiving the raw body for HMAC verification.
 */

const express = require('express');
const router        = express.Router(); // JSON routes : checkout, portal, status
const webhookRouter = express.Router(); // RAW body route : webhook
const logger  = require('../services/logger');
const stripe  = require('../services/stripeService');
const {
  upsertSubscription,
  findSubscriptionByCustomerId,
  getActiveSubscription,
  getDb,
} = require('../services/database');

// ─── POST /api/billing/checkout ──────────────────────────────────────────────
// Body: { plan: 'family_monthly' | 'family_yearly' | 'atelier_monthly' | 'atelier_yearly' }
// Auth: requires Bearer session token (added by parent middleware in bot.js)
router.post('/checkout', async (req, res) => {
  if (!stripe.isEnabled()) {
    return res.status(503).json({ error: 'billing_disabled', message: 'Stripe not configured on this instance' });
  }

  const phone = req.session?.phone;
  if (!phone) return res.status(401).json({ error: 'unauthorized' });

  const { plan, email } = req.body || {};
  const VALID_PLANS = ['family_monthly', 'family_yearly', 'atelier_monthly', 'atelier_yearly'];
  if (!VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'invalid_plan', valid: VALID_PLANS });
  }

  try {
    // Reuse existing Stripe customer if any
    const existing = findSubscriptionByCustomerId &&
      getDb().prepare('SELECT stripe_customer_id FROM subscriptions WHERE phone = ?').get(phone);
    const customerId = existing?.stripe_customer_id;

    const { url, sessionId } = await stripe.createCheckoutSession({
      phone, plan, email, customerId
    });
    logger.info('Checkout session created', { phone, plan, sessionId });
    res.json({ url });
  } catch (err) {
    logger.error('Checkout session creation failed', { phone, plan, error: err.message });
    res.status(500).json({ error: 'checkout_failed', message: err.message });
  }
});

// ─── POST /api/billing/portal ────────────────────────────────────────────────
// Returns a one-time Stripe Customer Portal URL for the authenticated user.
router.post('/portal', async (req, res) => {
  if (!stripe.isEnabled()) {
    return res.status(503).json({ error: 'billing_disabled' });
  }

  const phone = req.session?.phone;
  if (!phone) return res.status(401).json({ error: 'unauthorized' });

  const sub = getDb().prepare('SELECT stripe_customer_id FROM subscriptions WHERE phone = ?').get(phone);
  if (!sub) {
    return res.status(404).json({ error: 'no_subscription', message: 'You don\'t have a subscription yet' });
  }

  try {
    const { url } = await stripe.createPortalSession({
      customerId: sub.stripe_customer_id,
      returnUrl:  req.body?.returnUrl,
    });
    res.json({ url });
  } catch (err) {
    logger.error('Portal session creation failed', { phone, error: err.message });
    res.status(500).json({ error: 'portal_failed' });
  }
});

// ─── GET /api/billing/status ─────────────────────────────────────────────────
// Returns the authenticated user's current entitlement state.
router.get('/status', (req, res) => {
  const phone = req.session?.phone;
  if (!phone) return res.status(401).json({ error: 'unauthorized' });

  const sub = getActiveSubscription(phone);
  if (!sub) {
    return res.json({
      active:        false,
      stripeEnabled: stripe.isEnabled(),
    });
  }
  res.json({
    active:               true,
    tier:                 sub.tier,
    cadence:              sub.cadence,
    status:               sub.status,
    current_period_end:   sub.current_period_end,
    trial_end:            sub.trial_end,
    cancel_at_period_end: !!sub.cancel_at_period_end,
  });
});

// ─── POST /api/billing/webhook ───────────────────────────────────────────────
// Stripe-hosted webhook. Verified via HMAC against STRIPE_WEBHOOK_SECRET.
// MUST be mounted BEFORE global express.json() in bot.js (needs raw body).
webhookRouter.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe.isEnabled()) {
    return res.status(503).send('billing disabled');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.verifyWebhookSignature(req.body, sig);
  } catch (err) {
    logger.warn('Stripe webhook signature invalid', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ACK quickly (Stripe expects <30s)
  res.json({ received: true });

  try {
    await handleEvent(event);
  } catch (err) {
    logger.error('Stripe webhook handler failed', { eventType: event.type, error: err.message });
  }
});

// ─── Event dispatcher ────────────────────────────────────────────────────────
async function handleEvent(event) {
  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const phone   = session.metadata?.phone;
      const plan    = session.metadata?.plan;
      if (!phone || !session.subscription) {
        logger.warn('Checkout session missing phone/subscription metadata', { session: session.id });
        return;
      }

      // Fetch full subscription (Stripe returns IDs in checkout, need full object)
      const sub = await stripe.retrieveSubscription(session.subscription);
      const priceId = sub.items.data[0]?.price?.id;
      const tier    = stripe.tierFromPriceId(priceId);
      const cadence = plan.endsWith('_yearly') ? 'yearly' : 'monthly';

      upsertSubscription({
        phone,
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        tier,
        status:                 sub.status,
        cadence,
        current_period_end:     sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        trial_end:              sub.trial_end          ? new Date(sub.trial_end * 1000).toISOString()          : null,
        cancel_at_period_end:   sub.cancel_at_period_end,
      });

      logger.info('Subscription activated', {
        phone, tier, cadence,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const row = findSubscriptionByCustomerId(sub.customer);
      if (!row) {
        logger.warn('Subscription update for unknown customer', { customerId: sub.customer });
        return;
      }
      const priceId = sub.items.data[0]?.price?.id;
      const tier    = stripe.tierFromPriceId(priceId) || row.tier;

      upsertSubscription({
        phone:                  row.phone,
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        tier,
        status:                 sub.status,
        cadence:                row.cadence,
        current_period_end:     sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        trial_end:              sub.trial_end          ? new Date(sub.trial_end * 1000).toISOString()          : null,
        cancel_at_period_end:   sub.cancel_at_period_end,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const row = findSubscriptionByCustomerId(sub.customer);
      if (!row) return;
      upsertSubscription({
        phone:                  row.phone,
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        tier:                   row.tier,
        status:                 'canceled',
        cadence:                row.cadence,
        current_period_end:     row.current_period_end,
        trial_end:              row.trial_end,
        cancel_at_period_end:   false,
      });
      logger.info('Subscription canceled', { phone: row.phone, tier: row.tier });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const row = findSubscriptionByCustomerId(invoice.customer);
      if (row) logger.warn('Payment failed', { phone: row.phone, invoiceId: invoice.id });
      break;
    }

    case 'invoice.payment_succeeded': {
      // No-op : status update arrives via customer.subscription.updated
      break;
    }

    default:
      logger.debug('Stripe event ignored', { type: event.type });
  }
}

module.exports = { router, webhookRouter };
