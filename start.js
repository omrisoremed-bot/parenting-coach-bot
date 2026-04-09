'use strict';

/**
 * start.js — Lance le bot Parenting Coach avec tunnel + webhook auto-config
 * Usage: node start.js
 */

require('dotenv').config();
const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const twilio = require('twilio');

const PORT = parseInt(process.env.PORT || '3001', 10);
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Messaging Service SID configuré pour ParentEase
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MG6a0455b14a99b2bac366a97f9070cbeb';

async function updateTwilioWebhook(webhookUrl) {
  try {
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    await client.messaging.v1.services(MESSAGING_SERVICE_SID)
      .update({ inboundRequestUrl: webhookUrl, inboundMethod: 'POST' });
    console.log(`✅ Twilio webhook mis à jour : ${webhookUrl}`);
  } catch (err) {
    console.warn(`⚠️  Impossible de mettre à jour le webhook Twilio : ${err.message}`);
    console.warn(`   Configure manuellement : ${webhookUrl}`);
  }
}

async function main() {
  console.log('');
  console.log('🍼 Parenting Coach — Démarrage...');
  console.log('');

  // 1. Démarrer le serveur Express (bot.js) en arrière-plan
  const bot = spawn(process.execPath, ['bot.js'], {
    stdio: 'inherit',
    env: process.env,
  });

  bot.on('error', (err) => {
    console.error('❌ Erreur bot:', err.message);
    process.exit(1);
  });

  // Laisser le temps au serveur de démarrer
  await new Promise(r => setTimeout(r, 2000));

  // 2. Créer le tunnel localtunnel
  console.log(`🌍 Création du tunnel sur le port ${PORT}...`);
  let tunnel;
  try {
    tunnel = await localtunnel({ port: PORT });
  } catch (err) {
    console.error('❌ localtunnel échoué:', err.message);
    console.log('   Lance localtunnel manuellement : npx localtunnel --port', PORT);
    return;
  }

  const webhookUrl = `${tunnel.url}/webhook`;

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🍼 PARENTING COACH — ACTIF');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Tunnel URL  : ${tunnel.url}`);
  console.log(`   Webhook     : ${webhookUrl}`);
  console.log(`   Compte      : ParentEase (${ACCOUNT_SID?.slice(0, 10)}...)`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // 3. Mettre à jour le webhook Twilio automatiquement
  await updateTwilioWebhook(webhookUrl);

  // 4. Afficher les instructions de jointure
  console.log('');
  console.log('📱 Pour activer WhatsApp :');
  console.log('   Envoie "join on-help" au +1 415 523 8886');
  console.log('');

  // Gestion de la fermeture propre
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
