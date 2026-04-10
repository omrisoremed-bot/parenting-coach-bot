'use strict';

const { loadProfile, updateProfile } = require('./profileLoader');
const { setState, clearState } = require('../services/sessionManager');
const { sendMessage } = require('../services/whatsappService');
const { callAI, loadKnowledgeBase } = require('../services/aiService');
const fs   = require('fs');
const path = require('path');
const logger = require('../services/logger');

const soul         = fs.readFileSync(path.join(__dirname, '..', 'agents', 'SOUL.md'), 'utf8');
const systemPrompt = soul + loadKnowledgeBase();

const JOIN_CODE = process.env.SANDBOX_JOIN_CODE || 'join on-help';

// ─── Questions multilingues ───────────────────────────────────────────────────
const Q = {
  fr: {
    name:         'Super ! Comment tu t\'appelles ?',
    child:        'Quel est le prénom de ton enfant et son âge exact ?\n(ex: Yassine, 2 ans et 4 mois)',
    personality:  'Comment décrirais-tu sa personnalité ?\n\n1. Calme et facile\n2. Énergique et curieux\n3. Sensible et émotif\n4. Têtu et indépendant\n5. Anxieux et collant\n\nRéponds avec le numéro ou décris en quelques mots.',
    special:      'Ton enfant a-t-il des besoins particuliers ?\n(TDAH, autisme, anxiété, troubles du langage...)\n\nSi non, réponds "Aucun".',
    challenges:   'Quels sont tes 3 plus grands défis avec ton enfant en ce moment ?\n\nEx: crises de colère, sommeil difficile, refus d\'obéir...',
    family:       'Quelle est ta situation familiale ?\n\n1. En couple\n2. Parent célibataire\n3. Coparentalité\n4. Famille recomposée',
    culture:      'Tes valeurs culturelles ou religieuses à respecter ?\n(ex: valeurs islamiques, laïque, bilingue arabe/français...)',
  },
  ar: {
    name:         'رائع! ما اسمك؟',
    child:        'ما اسم طفلك وعمره بالضبط؟\n(مثال: ياسين، سنتان و4 أشهر)',
    personality:  'كيف تصف شخصية طفلك؟\n\n1. هادئ وسهل\n2. نشيط وفضولي\n3. حساس وعاطفي\n4. عنيد ومستقل\n5. قلق ومتعلق\n\nأجب برقم أو اكتب بكلماتك.',
    special:      'هل لدى طفلك احتياجات خاصة؟\n(ADHD، توحد، قلق، اضطرابات لغة...)\n\nإذا لا، اكتب "لا".',
    challenges:   'ما هي أكبر 3 تحديات تواجهها مع طفلك الآن؟\n\nمثال: نوبات غضب، صعوبة النوم، رفض الطاعة...',
    family:       'ما هو وضعك العائلي؟\n\n1. متزوج/ة\n2. أحد الوالدين\n3. حضانة مشتركة\n4. عائلة ممتدة',
    culture:      'ما هي قيمك الثقافية أو الدينية؟\n(مثال: قيم إسلامية، تعليم ثنائي اللغة...)',
  },
  darija: {
    name:         'زوين! شنو سميتك؟',
    child:        'شنو سمية ولدك/بنتك وشحال عمرو/ها؟\n(مثال: ياسين، جوج سنين و4 شهور)',
    personality:  'كيفاش كتوصف شخصية ولدك/بنتك؟\n\n1. هادي وسهل\n2. نشيط وفضولي\n3. حساس وعاطفي\n4. عنيد ومستقل\n5. قلقان ومتعلق\n\nجاوب برقم ولا بكلماتك.',
    special:      'واش عند ولدك/بنتك احتياجات خاصة؟\n(ADHD، توحد، قلق...)\n\nإلا لا، كتب "لا".',
    challenges:   'شنو هي أكبر 3 مشاكل عندك مع ولدك/بنتك دابا؟\n\nمثال: سوارة ديال الغضب، صعوبة النوم...',
    family:       'شنو هي وضعيتك العائلية؟\n\n1. متزوج/ة\n2. والد/ة وحيد\n3. حضانة مشتركة\n4. عائلة مركبة',
    culture:      'شنو هي قيمك الثقافية ولا الدينية؟\n(مثال: قيم إسلامية، تعليم بالعربية والفرنسية...)',
  },
  en: {
    name:         'Great! What\'s your name?',
    child:        'What\'s your child\'s name and exact age?\n(e.g. Yassine, 2 years and 4 months)',
    personality:  'How would you describe your child\'s personality?\n\n1. Calm and easy-going\n2. Energetic and curious\n3. Sensitive and emotional\n4. Strong-willed and independent\n5. Anxious and clingy\n\nReply with a number or describe in a few words.',
    special:      'Does your child have any special needs?\n(ADHD, autism, anxiety, speech delays...)\n\nIf no, type "None".',
    challenges:   'What are your 3 biggest challenges with your child right now?\n\nE.g. tantrums, sleep issues, not listening...',
    family:       'What is your family situation?\n\n1. Two-parent household\n2. Single parent\n3. Co-parenting\n4. Blended family',
    culture:      'Any cultural or religious values to respect?\n(e.g. Islamic values, bilingual education, secular...)',
  }
};

// Langue par défaut si non reconnue
const DEFAULT_LANG = 'fr';

function getQ(lang, key) {
  return (Q[lang] || Q[DEFAULT_LANG])[key];
}

// ─── STEPS — step 0 = choix de langue, steps 1-7 = questions profil ───────────
const STEPS = [
  { step: 0, field: null },           // Choix de langue
  { step: 1, field: 'parent.name' },  // Prénom parent
  { step: 2, field: 'child_info' },   // Enfant
  { step: 3, field: 'child_personality' },
  { step: 4, field: 'child_special_needs' },
  { step: 5, field: 'challenges' },
  { step: 6, field: 'family_structure' },
  { step: 7, field: 'cultural_context', action: 'GENERATE_PROGRAM' }
];

const personalityMap = {
  '1': 'calme et facile', '2': 'énergique et curieux',
  '3': 'sensible et émotif', '4': 'têtu et indépendant', '5': 'anxieux et collant'
};
const familyMap = {
  '1': 'married', '2': 'single-parent', '3': 'co-parenting', '4': 'blended-family'
};
const langMap = {
  '1': 'fr', '2': 'ar', '3': 'darija', '4': 'en',
  'fr': 'fr', 'français': 'fr', 'french': 'fr',
  'ar': 'ar', 'arabe': 'ar', 'arabic': 'ar', 'عربية': 'ar', 'عربي': 'ar',
  'darija': 'darija', 'دارجة': 'darija', 'دارجه': 'darija',
  'en': 'en', 'english': 'en', 'anglais': 'en'
};

// ─── Start onboarding ─────────────────────────────────────────────────────────
async function startOnboarding(phone) {
  setState(phone, { step: 'onboarding', onboarding_step: 0 });
  await updateProfile(phone, { onboarding_step: 0, session_state: 'onboarding', language: DEFAULT_LANG });

  const welcome = `👋 Bonjour / مرحبا / السلام عليكم

Je suis ton *Coach Parental IA* 🍼

📌 Pour te reconnecter : envoie *${JOIN_CODE}* au *+1 415 523 8886*

🌍 *Choisis ta langue / اختر لغتك :*

1️⃣ Français
2️⃣ العربية (Arabe)
3️⃣ الدارجة (Darija)
4️⃣ English`;

  await sendMessage(phone, welcome);
}

// ─── Handle onboarding message ────────────────────────────────────────────────
async function handleOnboardingMessage(phone, text) {
  const profile    = loadProfile(phone);
  const currentStep = profile?.onboarding_step || 0;
  const lang        = profile?.language || DEFAULT_LANG;

  logger.info('Onboarding step', { phone, currentStep, lang });

  await applyAnswer(phone, currentStep, text, profile);

  const nextStep = currentStep + 1;

  if (nextStep >= STEPS.length || STEPS[nextStep]?.action === 'GENERATE_PROGRAM') {
    await generateAndSendProgram(phone);
    return false;
  }

  await updateProfile(phone, { onboarding_step: nextStep });
  setState(phone, { step: 'onboarding', onboarding_step: nextStep });

  // Load updated profile to get language choice if just saved
  const updatedProfile = loadProfile(phone);
  const updatedLang    = updatedProfile?.language || DEFAULT_LANG;
  const nextQuestion   = getNextQuestion(nextStep, updatedLang);
  await sendMessage(phone, nextQuestion);

  return true;
}

function getNextQuestion(step, lang) {
  switch (step) {
    case 1: return getQ(lang, 'name');
    case 2: return getQ(lang, 'child');
    case 3: return getQ(lang, 'personality');
    case 4: return getQ(lang, 'special');
    case 5: return getQ(lang, 'challenges');
    case 6: return getQ(lang, 'family');
    case 7: return getQ(lang, 'culture');
    default: return getQ(lang, 'name');
  }
}

// ─── Apply answer ─────────────────────────────────────────────────────────────
async function applyAnswer(phone, answeredStep, text, profile) {
  const updates = { ...profile };

  switch (answeredStep) {
    case 0: {
      // Language choice
      const normalized = text.trim().toLowerCase();
      const chosen = langMap[normalized] || langMap[text.trim()] || DEFAULT_LANG;
      updates.language = chosen;
      break;
    }
    case 1: {
      // Parent name
      updates.parent = { ...(updates.parent || {}), name: text.trim() };
      break;
    }
    case 2: {
      // Child info
      const child = parseChildInfo(text);
      updates.children = [child];
      break;
    }
    case 3: {
      // Personality
      const p = personalityMap[text.trim()] || text.trim();
      if (updates.children?.[0]) updates.children[0].personality = p;
      break;
    }
    case 4: {
      // Special needs
      const needs = ['aucun','لا','none','no'].includes(text.trim().toLowerCase()) ? 'none' : text.trim();
      if (updates.children?.[0]) updates.children[0].special_needs = needs;
      break;
    }
    case 5: {
      // Challenges
      updates.challenges = text.split(/[,\n]/).map(c => c.trim()).filter(Boolean);
      break;
    }
    case 6: {
      // Family structure
      updates.parent = { ...(updates.parent || {}), family_structure: familyMap[text.trim()] || text.trim() };
      break;
    }
    case 7: {
      // Cultural context
      updates.cultural_context = text.trim();
      break;
    }
  }

  await updateProfile(phone, updates);
}

function parseChildInfo(text) {
  const child = {
    name: '', age_months: 0, gender: 'unknown',
    personality: '', special_needs: 'none',
    health_conditions: 'none', in_school: false,
    screen_time_hours: 0, sleep_bedtime: '21:00', sleep_wake: '07:00'
  };
  const nameMatch = text.match(/^([A-Za-zÀ-ÿا-ي\-]+)/u);
  if (nameMatch) child.name = nameMatch[1];
  const yearsMatch  = text.match(/(\d+)\s*(ans?|year|سنة|سنين|عام|عوام)/i);
  const monthsMatch = text.match(/(\d+)\s*(mois|month|شهر|شهور|شهار)/i);
  child.age_months = (yearsMatch ? parseInt(yearsMatch[1]) : 0) * 12
                   + (monthsMatch ? parseInt(monthsMatch[1]) : 0);
  return child;
}

// ─── Generate welcome program ─────────────────────────────────────────────────
async function generateAndSendProgram(phone) {
  const profile = loadProfile(phone);
  const lang    = profile?.language || DEFAULT_LANG;

  await updateProfile(phone, {
    onboarding_complete: true, cron_active: true,
    session_state: 'idle', onboarding_step: STEPS.length
  });
  clearState(phone);

  const programPrompt = `
PROFIL : ${JSON.stringify(profile, null, 2)}

L'onboarding est terminé. Génère un message de bienvenue personnalisé qui :
1. Confirme le profil (mentionne le prénom de l'enfant)
2. Résume en 3 points les priorités à travailler
3. Explique le rythme : plan du matin à 8h, bilan du soir à 21h, bilan hebdo le dimanche
4. Termine avec : "Prêt(e) à commencer ? 💪"

Max 200 mots. Langue OBLIGATOIRE : ${lang}.
Si langue = "ar" ou "darija" → écris en arabe/darija.
Pas de markdown complexe (WhatsApp).
  `.trim();

  try {
    const message = await callAI(systemPrompt, programPrompt);
    await sendMessage(phone, message);
  } catch (err) {
    logger.error('Failed to generate welcome program', { phone, error: err.message });
    const fallbacks = {
      fr: `Parfait ! Ton profil est créé. Premier plan demain matin à 8h. 🌟`,
      ar: `تم إنشاء ملفك الشخصي. سأرسل لك أول خطة غداً الساعة 8 صباحاً. 🌟`,
      darija: `تم! كيفاشك؟ غدا الساعة 8 كنسيفطلك أول خطة. 🌟`,
      en: `Profile created! Your first morning plan is tomorrow at 8am. 🌟`
    };
    await sendMessage(phone, fallbacks[lang] || fallbacks.fr);
  }
}

module.exports = { startOnboarding, handleOnboardingMessage };
