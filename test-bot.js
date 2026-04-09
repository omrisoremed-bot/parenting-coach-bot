'use strict';

/**
 * Full end-to-end bot test — no WhatsApp credentials needed.
 * Intercepts sendMessage and prints what would be sent to WhatsApp.
 * Simulates a complete user journey: onboarding → morning plan → conversation.
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

// ── Intercept whatsappService BEFORE any other module loads it ───────────────
const sentMessages = [];
require.cache[require.resolve('./services/whatsappService')] = {
  id: require.resolve('./services/whatsappService'),
  filename: require.resolve('./services/whatsappService'),
  loaded: true,
  exports: {
    sendMessage: async (to, text) => {
      sentMessages.push({ to, text });
      console.log('\n' + '─'.repeat(60));
      console.log(`📱 BOT → ${to}`);
      console.log('─'.repeat(60));
      console.log(text);
      console.log('─'.repeat(60));
    },
    sendTemplate: async () => {},
    sleep: (ms) => new Promise(r => setTimeout(r, ms))
  }
};

const messageHandler    = require('./handlers/messageHandler');
const { loadProfile }   = require('./handlers/profileLoader');
const { callAI, buildMorningPrompt } = require('./services/aiService');
const soul = fs.readFileSync(path.join(__dirname, 'agents', 'SOUL.md'), 'utf8');

const TEST_PHONE = '+212600000001';

// Clean up previous test user
const userFile = path.join(__dirname, 'users', `${TEST_PHONE}.json`);
if (fs.existsSync(userFile)) fs.unlinkSync(userFile);

async function send(text) {
  console.log(`\n👤 USER: "${text}"`);
  await messageHandler(TEST_PHONE, text);
  await sleep(500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function section(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

(async () => {
  console.log('\n🤖 PARENTING COACH BOT — DEMO COMPLET');
  console.log('Modèle IA:', process.env.AI_MODEL);
  console.log('Provider:  ', process.env.AI_BASE_URL);

  // ── PHASE 1: ONBOARDING ──────────────────────────────────────────────────
  section('PHASE 1 — ONBOARDING (7 étapes)');

  await send('Bonjour');                                        // step 0 → question 1
  await send('Fatima');                                         // name → question 2
  await send('Yassine, 2 ans et 4 mois');                      // child info → question 3
  await send('4');                                              // personality: têtu → question 4
  await send('Aucun');                                          // no special needs → question 5
  await send('Crises de colère le matin, refuse de manger, frappe quand frustré'); // challenges → question 6
  await send('1');                                              // married → question 7
  await send('Valeurs islamiques, arabe et français à la maison'); // cultural → GENERATE

  // Wait for AI to generate welcome program
  await sleep(2000);

  // ── PHASE 2: FREE CONVERSATION ───────────────────────────────────────────
  section('PHASE 2 — CONVERSATION LIBRE');

  await send('Mon fils a fait une crise terrible ce matin, je suis épuisée');
  await sleep(2000);

  // ── PHASE 3: MORNING PLAN SIMULATION ────────────────────────────────────
  section('PHASE 3 — PLAN DU MATIN (simulation cron 08:00)');

  const profile = loadProfile(TEST_PHONE);
  if (profile) {
    const prompt = buildMorningPrompt(profile);
    console.log('\n⏰ [CRON 08:00] Génération du plan du matin...');
    const morning = await callAI(soul, prompt);
    console.log('\n' + '─'.repeat(60));
    console.log(`📱 BOT → ${TEST_PHONE} (plan matinal)`);
    console.log('─'.repeat(60));
    console.log(morning);
    console.log('─'.repeat(60));
  }

  // ── PHASE 4: COMMAND TEST ────────────────────────────────────────────────
  section('PHASE 4 — COMMANDES');

  await send('stop');
  await send('reprendre');
  await send('aide');

  // ── FINAL PROFILE ────────────────────────────────────────────────────────
  section('PROFIL UTILISATEUR CRÉÉ');
  const finalProfile = loadProfile(TEST_PHONE);
  if (finalProfile) {
    console.log(JSON.stringify(finalProfile, null, 2));
  }

  console.log('\n✅ TEST COMPLET TERMINÉ');
  console.log(`📊 Messages envoyés: ${sentMessages.length}`);
  console.log('\n🔗 URL publique (Twilio webhook):');
  console.log('   https://dull-pants-tease.loca.lt/webhook\n');

  process.exit(0);
})().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
