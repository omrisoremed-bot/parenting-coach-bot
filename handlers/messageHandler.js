'use strict';

const { loadProfile, createProfile } = require('./profileLoader');
const { getState, setState, clearState } = require('../services/sessionManager');
const { startOnboarding, handleOnboardingMessage } = require('./onboardingFlow');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI, buildConversationPrompt, loadKnowledgeBase } = require('../services/aiService');
const logger = require('../services/logger');
const fs = require('fs');
const path = require('path');

const soul = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');

// Charge la base de connaissances une fois au démarrage
const knowledgeBase = loadKnowledgeBase();
const systemPrompt = soul + knowledgeBase;

// ─── Commands ────────────────────────────────────────────────────────────────
const COMMANDS = {
  STOP:   ['pause', 'arrêt', 'arret', 'désabonner', 'désabonnement'],
  RESUME: ['resume', 'reprendre', 'start', 'activer', 'commencer'],
  HELP:   ['aide', 'help', '?', 'menu'],
  RESET:  ['reset', 'recommencer', 'restart', 'nouveau profil'],
  PROFIL: ['profil', 'profile', 'mon profil', 'mes infos', 'voir profil']
};

/**
 * Main entry point called from webhook for every incoming user message.
 */
async function messageHandler(phone, text) {
  const normalizedText = (text || '').trim();

  // ── 1. Load or create profile ─────────────────────────────────────────────
  let profile = loadProfile(phone);

  if (!profile) {
    logger.info('New user detected', { phone });
    profile = createProfile(phone);
    await startOnboarding(phone);
    return;
  }

  // ── 2. Handle global commands (bypass normal flow) ────────────────────────
  const command = detectCommand(normalizedText);

  if (command === 'STOP') {
    const { updateProfile } = require('./profileLoader');
    await updateProfile(phone, { cron_active: false });
    clearState(phone);
    await sendMessage(phone, 'Tu ne recevras plus de messages automatiques. Envoie "reprendre" quand tu veux recommencer. 👋');
    return;
  }

  if (command === 'RESUME') {
    const { updateProfile } = require('./profileLoader');
    await updateProfile(phone, { cron_active: true });
    clearState(phone);
    await sendMessage(phone, '✅ Tes messages quotidiens sont réactivés ! Tu recevras ton plan demain matin à 8h.');
    return;
  }

  if (command === 'HELP') {
    await sendMessage(phone, buildHelpMessage());
    return;
  }

  if (command === 'PROFIL') {
    await sendMessage(phone, buildProfileMessage(profile));
    return;
  }

  if (command === 'RESET') {
    // Delete profile and restart onboarding
    const { saveProfile } = require('./profileLoader');
    saveProfile(phone, {
      phone,
      language: 'fr',
      onboarding_complete: false,
      onboarding_step: 0,
      created_at: profile.created_at,
      last_active: new Date().toISOString(),
      cron_active: false,
      parent: {},
      children: [],
      challenges: [],
      parenting_style: '',
      cultural_context: '',
      weekly_checkins: [],
      session_state: 'onboarding'
    });
    await startOnboarding(phone);
    return;
  }

  // ── 3. Route by session state ─────────────────────────────────────────────
  const state = getState(phone);
  logger.debug('Session state', { phone, state });

  if (!profile.onboarding_complete || state.step === 'onboarding') {
    await handleOnboardingMessage(phone, normalizedText);
    return;
  }

  if (state.step === 'awaiting_checkin_response') {
    await handleCheckinResponse(phone, normalizedText, profile);
    return;
  }

  // ── 4. Default: free-form AI conversation ─────────────────────────────────
  await handleConversation(phone, normalizedText, profile);
}

async function handleConversation(phone, text, profile) {
  try {
    const prompt = buildConversationPrompt(profile, text);
    const reply = await callAI(systemPrompt, prompt);
    await sendMessage(phone, reply);
  } catch (err) {
    logger.error('AI conversation error', { phone, error: err.message });
    await sendMessage(
      phone,
      'Désolé, j\'ai eu un problème technique. Peux-tu reformuler ta question ? 🙏'
    );
  }
}

async function handleCheckinResponse(phone, text, profile) {
  // Parse evening check-in responses and store in weekly_checkins
  const checkins = profile.weekly_checkins || [];
  checkins.push({
    date: new Date().toISOString(),
    response: text
  });

  const { updateProfile } = require('./profileLoader');
  await updateProfile(phone, { weekly_checkins: checkins.slice(-30) }); // keep last 30

  clearState(phone);

  // Generate a brief AI response to the check-in
  const prompt = `
Le parent a répondu au bilan du soir : "${text}"
Profil : ${JSON.stringify(profile, null, 2)}

Génère une réponse courte (50-80 mots) :
- Valide ce qui s'est passé
- Si difficultés mentionnées : donne 1 conseil pratique immédiat
- Si bonne journée : félicite sincèrement
- Termine avec une courte note d'encouragement pour demain
Langue : ${profile.language || 'fr'}
  `.trim();

  try {
    const reply = await callAI(systemPrompt, prompt);
    await sendMessage(phone, reply);
  } catch (err) {
    logger.error('Checkin response AI error', { phone, error: err.message });
    await sendMessage(phone, 'Merci pour ton retour ! À demain matin 🌅');
  }
}

function detectCommand(text) {
  const lower = text.toLowerCase().trim();
  for (const [cmd, keywords] of Object.entries(COMMANDS)) {
    if (keywords.some(k => lower === k || lower.startsWith(k + ' '))) {
      return cmd;
    }
  }
  return null;
}

function buildProfileMessage(profile) {
  const p = profile.parent || {};
  const children = (profile.children || []);
  const challenges = (profile.challenges || []);

  const langLabels = { fr: '🇫🇷 Français', ar: '🇲🇦 Arabe', darija: '🇲🇦 Darija', en: '🇬🇧 Anglais' };
  const cronStatus = profile.cron_active ? '✅ Actif' : '⏸️ En pause';

  const childrenText = children.length
    ? children.map(c => `  • ${c.name || '?'}, ${c.age || '?'} ans${c.gender ? ` (${c.gender})` : ''}`).join('\n')
    : '  • Non renseigné';

  const challengesText = challenges.length
    ? challenges.map(c => `  • ${c}`).join('\n')
    : '  • Aucun renseigné';

  return `*MON PROFIL — COACH PARENTAL* 👤

*Parent :* ${p.name || 'Non renseigné'}
*Langue :* ${langLabels[profile.language] || profile.language || 'fr'}
*Style parental :* ${profile.parenting_style || 'Non défini'}
*Contexte culturel :* ${profile.cultural_context || 'Non renseigné'}

*Enfant(s) :*
${childrenText}

*Défis déclarés :*
${challengesText}

*Messages automatiques :* ${cronStatus}
*Membre depuis :* ${profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '?'}

📝 Tape *reset* pour recommencer le profil
❓ Tape *aide* pour voir toutes les commandes`;
}

function buildHelpMessage() {
  const joinCode = process.env.SANDBOX_JOIN_CODE || 'join on-help';
  return `*COACH PARENTAL — AIDE* 🍼

*Commandes disponibles :*
• *profil* — Voir ton profil
• *pause* — Pause les messages automatiques
• *reprendre* — Réactiver les messages
• *reset* — Recommencer le profil
• *aide* — Afficher ce menu

Tu peux aussi m'écrire librement sur n'importe quel défi avec ton enfant 💬

*Horaires automatiques :*
• 8h00 — Plan parental du jour
• 21h00 — Bilan du soir
• Dimanche 19h00 — Bilan de la semaine

*Se reconnecter au bot :*
Envoie *${joinCode}* au *+1 415 523 8886*`;
}

module.exports = messageHandler;
