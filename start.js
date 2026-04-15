'use strict';

/**
 * start.js — Lance le bot Parenting Coach avec tunnel + webhook auto-config
 *
 * Ordre de démarrage (important) :
 *   1. Tunnel localtunnel → on obtient l'URL publique
 *   2. Bot Express lancé avec TWILIO_WEBHOOK_URL injecté dans l'env
 *   3. Webhook Twilio mis à jour via API
 *
 * Cet ordre garantit que `verifyTwilioSignature()` dans bot.js dispose
 * de la bonne URL dès le premier message reçu.
 */

require('dotenv').config();
const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const twilio = require('twilio');

const PORT               = parseInt(process.env.PORT || '3001', 10);
const ACCOUNT_SID        = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN         = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SVC_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MG6a0455b14a99b2bac366a97f9070cbeb';

async function updateTwilioWebhook(webhookUrl) {
  try {
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    await client.messaging.v1.services(MESSAGING_SVC_SID)
      .update({ inboundRequestUrl: webhookUrl, inboundMethod: 'POST' });
    console.log(`✅ Twilio webhook mis à jour : ${webhookUrl}`);
  } catch (err) {
    console.warn(`⚠️  Impossible de mettre à jour le webhook Twilio : ${err.message}`);
    console.warn(`   Configure manuellement dans la console Twilio : ${webhookUrl}`);
  }
}

async function main() {
  console.log('');
  console.log('🍼 Parenting Coach — Démarrage...');
  console.log('');

  // ── 1. Tunnel d'abord — on a besoin de l'URL avant de lancer le bot ─────────
  console.log(`🌍 Création du tunnel sur le port ${PORT}...`);
  let tunnel;
  try {
    tunnel = await localtunnel({ port: PORT });
  } catch (err) {
    console.error('❌ localtunnel échoué:', err.message);
    console.log('   Lance localtunnel manuellement : npx localtunnel --port', PORT);
    process.exit(1);
  }

  const webhookUrl = `${tunnel.url}/webhook`;

  // ── 2. Lancer le bot avec TWILIO_WEBHOOK_URL injecté dans l'env ─────────────
  // verifyTwilioSignature() dans bot.js lira cette valeur pour valider les sigs.
  const bot = spawn(process.execPath, ['bot.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TWILIO_WEBHOOK_URL: webhookUrl  // ← URL dynamique de cette session
    }
  });

  bot.on('error', (err) => {
    console.error('❌ Erreur bot:', err.message);
    tunnel.close();
    process.exit(1);
  });

  bot.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Bot terminé avec code ${code}`);
      tunnel.close();
      process.exit(code ?? 1);
    }
  });

  // Laisser le temps au serveur Express de démarrer
  await new Promise(r => setTimeout(r, 2000));

  // ── 3. Mettre à jour le webhook Twilio ──────────────────────────────────────
  await updateTwilioWebhook(webhookUrl);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🍼 PARENTING COACH — ACTIF');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Tunnel URL  : ${tunnel.url}`);
  console.log(`   Webhook     : ${webhookUrl}`);
  console.log(`   Compte      : ${ACCOUNT_SID?.slice(0, 10)}...`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📱 Pour activer WhatsApp (sandbox) :');
  console.log(`   Envoie "${process.env.SANDBOX_JOIN_CODE || 'join on-help'}" au +1 415 523 8886`);
  console.log('');

  // ── Gestion de la fermeture propre ──────────────────────────────────────────
  tunnel.on('close', () => {
    console.log('🔌 Tunnel fermé');
    bot.kill();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Arrêt...');
    tunnel.close();
    bot.kill();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
