'use strict';

const { loadProfile, updateProfile } = require('./profileLoader');
const { setState, clearState } = require('../services/sessionManager');
const { sendMessage } = require('../services/whatsappService');
const { callAI, buildConversationPrompt } = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');

const soul = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');

const JOIN_CODE = process.env.SANDBOX_JOIN_CODE || 'join on-help';

const STEPS = [
  {
    step: 0,
    field: null,
    question: `👋 Bonjour ! Je suis ton *Coach Parental IA* personnel.

Je vais créer un programme sur mesure pour toi et ton enfant. 🌟

📌 *Note importante :* Si tu te déconnectes, reconnecte-toi en envoyant :
*${JOIN_CODE}*
au numéro *+1 415 523 8886*

Commençons ! Comment tu t'appelles ?`
  },
  {
    step: 1,
    field: 'parent.name',
    question: `Super ! Quel est le prénom de ton enfant et son âge exact ?
(ex: Yassine, 2 ans et 4 mois)`
  },
  {
    step: 2,
    field: 'child_info', // special: parsed into children array
    question: `Comment décrirais-tu sa personnalité ?

1. Calme et facile
2. Énergique et curieux
3. Sensible et émotif
4. Têtu et indépendant
5. Anxieux et collant

Réponds avec le numéro ou décris en quelques mots.`
  },
  {
    step: 3,
    field: 'child_personality',
    question: `Ton enfant a-t-il des besoins particuliers ?
(TDAH, autisme, anxiété, troubles du langage, handicap physique...)

Si non, réponds "Aucun".`
  },
  {
    step: 4,
    field: 'child_special_needs',
    question: `Quels sont tes 3 plus grands défis avec ton enfant en ce moment ?

Ex: crises de colère, sommeil difficile, refus d'obéir, frères et sœurs qui se battent...`
  },
  {
    step: 5,
    field: 'challenges',
    question: `Quelle est ta situation familiale ?

1. En couple (deux parents au foyer)
2. Parent célibataire
3. Coparentalité (séparé/divorcé)
4. Famille recomposée`
  },
  {
    step: 6,
    field: 'family_structure',
    question: `Dernier point : tes valeurs culturelles ou religieuses à respecter ?
(ex: valeurs islamiques, éducation bilingue arabe/français, laïque...)`
  },
  {
    step: 7,
    field: 'cultural_context',
    action: 'GENERATE_PROGRAM'
  }
];

const personalityMap = {
  '1': 'calm and easy-going',
  '2': 'energetic and curious',
  '3': 'sensitive and emotional',
  '4': 'strong-willed and independent',
  '5': 'anxious and clingy'
};

const familyMap = {
  '1': 'married',
  '2': 'single-parent',
  '3': 'co-parenting',
  '4': 'blended-family'
};

/**
 * Start the onboarding flow by sending the first question.
 */
async function startOnboarding(phone) {
  setState(phone, { step: 'onboarding', onboarding_step: 0 });
  await updateProfile(phone, { onboarding_step: 0, session_state: 'onboarding' });
  await sendMessage(phone, STEPS[0].question);
}

/**
 * Handle an incoming message during onboarding.
 * Returns true if onboarding is still active, false if completed.
 */
async function handleOnboardingMessage(phone, text) {
  const profile = loadProfile(phone);
  const currentStep = profile?.onboarding_step || 0;

  logger.info('Onboarding step', { phone, currentStep });

  // Save the answer for the CURRENT step question the user just answered
  await applyAnswer(phone, currentStep, text, profile);

  const nextStep = currentStep + 1;

  // If the next step triggers program generation (or we've run out of steps)
  if (nextStep >= STEPS.length || STEPS[nextStep]?.action === 'GENERATE_PROGRAM') {
    await generateAndSendProgram(phone);
    return false; // onboarding done
  }

  // Move to next step
  await updateProfile(phone, { onboarding_step: nextStep });
  setState(phone, { step: 'onboarding', onboarding_step: nextStep });
  await sendMessage(phone, STEPS[nextStep].question);

  return true;
}

async function applyAnswer(phone, answeredStep, text, profile) {
  const step = STEPS[answeredStep];
  if (!step) return;

  const updates = { ...profile };

  switch (answeredStep) {
    case 0: {
      // Parent name
      updates.parent = { ...(updates.parent || {}), name: text.trim() };
      break;
    }
    case 1: {
      // Child name + age
      const child = parseChildInfo(text);
      updates.children = [child];
      break;
    }
    case 2: {
      // Personality
      const personality = personalityMap[text.trim()] || text.trim();
      if (updates.children && updates.children[0]) {
        updates.children[0].personality = personality;
      }
      break;
    }
    case 3: {
      // Special needs
      const needs = text.trim().toLowerCase() === 'aucun' ? 'none' : text.trim();
      if (updates.children && updates.children[0]) {
        updates.children[0].special_needs = needs;
      }
      break;
    }
    case 4: {
      // Challenges
      updates.challenges = text
        .split(/[,\n]/)
        .map(c => c.trim())
        .filter(Boolean);
      break;
    }
    case 5: {
      // Family structure
      const structure = familyMap[text.trim()] || text.trim();
      updates.parent = { ...(updates.parent || {}), family_structure: structure };
      break;
    }
    case 6: {
      // Cultural context
      updates.cultural_context = text.trim();
      break;
    }
  }

  await updateProfile(phone, updates);
}

function parseChildInfo(text) {
  // Try to extract name and age from strings like "Yassine, 2 ans et 4 mois"
  const child = {
    name: '',
    age_months: 0,
    gender: 'unknown',
    personality: '',
    special_needs: 'none',
    health_conditions: 'none',
    in_school: false,
    screen_time_hours: 0,
    sleep_bedtime: '21:00',
    sleep_wake: '07:00'
  };

  // Extract name (first word/token before comma or number)
  const nameMatch = text.match(/^([A-Za-zÀ-ÿ\-]+)/);
  if (nameMatch) child.name = nameMatch[1];

  // Extract years
  const yearsMatch = text.match(/(\d+)\s*(ans?|year)/i);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;

  // Extract months
  const monthsMatch = text.match(/(\d+)\s*(mois|month)/i);
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;

  child.age_months = years * 12 + months;

  return child;
}

async function generateAndSendProgram(phone) {
  const profile = loadProfile(phone);

  // Mark onboarding complete
  await updateProfile(phone, {
    onboarding_complete: true,
    cron_active: true,
    session_state: 'idle',
    onboarding_step: STEPS.length
  });
  clearState(phone);

  const childName = profile?.children?.[0]?.name || 'ton enfant';
  const parentName = profile?.parent?.name || '';

  const programPrompt = `
Lis ce profil utilisateur : ${JSON.stringify(profile, null, 2)}

L'onboarding est terminé. Génère un message de bienvenue personnalisé qui :
1. Confirme que tu as bien enregistré leur profil (mentionne le prénom de l'enfant)
2. Résume en 3 bullet points les priorités que tu vas travailler avec eux
3. Explique le rythme : plan du matin à 8h, bilan du soir à 21h, bilan hebdo le dimanche
4. Termine avec une question d'engagement : "Prêt(e) à commencer ?"

Max 200 mots. Langue : ${profile?.language || 'fr'}.
Chaleureux et motivant. Pas de markdown complexe.
  `.trim();

  try {
    const message = await callAI(soul, programPrompt);
    await sendMessage(phone, message);
  } catch (err) {
    logger.error('Failed to generate welcome program', { phone, error: err.message });
    await sendMessage(
      phone,
      `Parfait ${parentName} ! Ton profil est créé. Je t'enverrai ton premier plan parental demain matin à 8h. À ce soir pour le bilan ! 🌟`
    );
  }
}

module.exports = { startOnboarding, handleOnboardingMessage };
