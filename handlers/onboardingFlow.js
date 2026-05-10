'use strict';

/**
 * onboardingFlow.js — Streamlined 4-step onboarding (was 8).
 *
 * Steps :
 *   0  Language choice (5 options)
 *   1  Parent name + child name + child age (combined, parsed)
 *   2  Main challenge (numbered options + free text)
 *   3  Cron activation confirm (yes/no)  → GENERATE_PROGRAM
 *
 * Everything else (parenting style, family structure, cultural context,
 * personality, special needs) is enriched LAZILY through the LLM in normal
 * conversation flow — the bot asks naturally when relevant.
 *
 * Rationale (audit 2026-05-10) : 8-step onboarding had ~50% drop-off.
 * Reducing friction is the highest-leverage conversion lever before paywall.
 *
 * Backward compat : users at old onboarding_step >= 3 are auto-marked complete
 * via a one-shot DB migration in services/database.js.
 */

const { loadProfile, updateProfile } = require('./profileLoader');
const { setState, clearState } = require('../services/sessionManager');
const { sendMessage } = require('../services/messengerAdapter');
const { callAI } = require('../services/aiService');
const { systemPrompt } = require('../services/promptBuilder');
const logger = require('../services/logger');

const JOIN_CODE    = process.env.SANDBOX_JOIN_CODE || 'join on-help';
const DEFAULT_LANG = 'fr';

// ─── Multilingual prompts ────────────────────────────────────────────────────
const Q = {
  fr: {
    parentChild: 'Super ! Pour démarrer, j\'ai besoin de 2 infos en une phrase :\n\n*Ton prénom + le prénom et l\'âge de ton enfant.*\n\nEx: « Sarah, mon fils Yassine a 3 ans »\n     « Aïcha — Lina, 18 mois »',
    challenge:   'Quel est ton plus gros défi en ce moment ?\n\n1️⃣ Sommeil & nuits\n2️⃣ Crises & colères\n3️⃣ Écrans & limites\n4️⃣ Alimentation & repas\n5️⃣ École & devoirs\n6️⃣ Autre (écris-moi en quelques mots)',
    confirm:     'Parfait ! Pour finir, tu veux recevoir :\n\n☀️ Un plan parental personnalisé chaque matin à 8h\n🌙 Un check-in chaque soir à 21h\n📋 Un bilan chaque dimanche\n\n*Réponds OUI ou NON.* Tu pourras tout arrêter à tout moment avec « stop ».',
    parseHelp:   'Hmm, je n\'ai pas bien lu l\'âge de ton enfant. Tu peux ré-essayer ?\n\nEx: « Sarah, Yassine 3 ans » ou « Marie, Lila a 2 ans et 4 mois »',
    fallbackOK:  'C\'est parti ! 🎉 Premier plan demain matin à 8h.\nÉcris-moi dès que tu as une question.',
    fallbackKO:  'Pas de souci, je reste ici quand tu en as besoin. Écris « reprendre » pour activer les messages quotidiens. 🤍',
  },
  en: {
    parentChild: 'Great! To get started, I need 2 things in one message:\n\n*Your name + your child\'s name and age.*\n\nE.g. "Sarah, my son Yassine is 3"\n     "Mike — Lina, 18 months"',
    challenge:   'What\'s your biggest challenge right now?\n\n1️⃣ Sleep & nights\n2️⃣ Tantrums & meltdowns\n3️⃣ Screens & limits\n4️⃣ Eating & meals\n5️⃣ School & homework\n6️⃣ Other (tell me in a few words)',
    confirm:     'Perfect! Last thing — do you want to receive:\n\n☀️ A personalized morning plan at 8am\n🌙 An evening check-in at 9pm\n📋 A weekly review on Sunday\n\n*Reply YES or NO.* You can stop anytime with "stop".',
    parseHelp:   'Hmm, I couldn\'t catch your child\'s age. Try again?\n\nE.g. "Sarah, Yassine 3 years" or "Marie, Lila is 2 years and 4 months"',
    fallbackOK:  'Here we go! 🎉 First plan tomorrow at 8am.\nWrite to me anytime you have a question.',
    fallbackKO:  'No worries, I\'m here when you need me. Text "resume" to activate daily messages anytime. 🤍',
  },
  ar: {
    parentChild: 'رائع! للبدء، أحتاج إلى معلومتين في رسالة واحدة:\n\n*اسمك + اسم طفلك وعمره.*\n\nمثال: «عائشة، ابني ياسين عمره 3 سنوات»',
    challenge:   'ما هو أكبر تحدٍ تواجهينه الآن؟\n\n1️⃣ النوم والليالي\n2️⃣ نوبات الغضب\n3️⃣ الشاشات والحدود\n4️⃣ الطعام والوجبات\n5️⃣ المدرسة والواجبات\n6️⃣ آخر (اكتبيه بكلماتك)',
    confirm:     'ممتاز! آخر شيء — هل تريدين:\n\n☀️ خطة صباحية مخصصة على الساعة 8\n🌙 تسجيل دخول مسائي على الساعة 9\n📋 ملخص أسبوعي يوم الأحد\n\n*أجيبي بـ نعم أو لا.* يمكنك إيقاف ذلك في أي وقت بكتابة "stop".',
    parseHelp:   'لم أفهم عمر طفلك. حاولي مرة أخرى من فضلك.\n\nمثال: «عائشة، ياسين 3 سنوات»',
    fallbackOK:  'هيا بنا! 🎉 أول خطة غداً الساعة 8 صباحاً.',
    fallbackKO:  'لا بأس، أنا هنا عندما تحتاجينني. اكتبي "reprendre" لتفعيل الرسائل اليومية. 🤍',
  },
  es: {
    parentChild: '¡Genial! Para empezar, necesito 2 cosas en un mensaje:\n\n*Tu nombre + el nombre y la edad de tu hijo/a.*\n\nEj: "Sara, mi hijo Carlos tiene 3 años"',
    challenge:   '¿Cuál es tu mayor desafío ahora?\n\n1️⃣ Sueño & noches\n2️⃣ Berrinches\n3️⃣ Pantallas & límites\n4️⃣ Alimentación\n5️⃣ Escuela & tareas\n6️⃣ Otro (dímelo en pocas palabras)',
    confirm:     '¡Perfecto! Última cosa — ¿quieres recibir:\n\n☀️ Un plan personalizado cada mañana a las 8\n🌙 Un check-in cada noche a las 21\n📋 Un resumen cada domingo\n\n*Responde SÍ o NO.* Puedes parar en cualquier momento con "stop".',
    parseHelp:   'No pude leer la edad de tu hijo. ¿Puedes intentarlo de nuevo?',
    fallbackOK:  '¡Empezamos! 🎉 Primer plan mañana a las 8am.',
    fallbackKO:  'Sin problema, aquí estoy. Escribe "reprendre" para activar.',
  },
  pt: {
    parentChild: 'Ótimo! Para começar, preciso de 2 coisas numa mensagem:\n\n*Seu nome + nome e idade do seu filho/a.*\n\nEx: "Sara, meu filho Carlos tem 3 anos"',
    challenge:   'Qual é seu maior desafio agora?\n\n1️⃣ Sono & noites\n2️⃣ Birras\n3️⃣ Telas & limites\n4️⃣ Alimentação\n5️⃣ Escola & lições\n6️⃣ Outro (em poucas palavras)',
    confirm:     'Perfeito! Última coisa — quer receber:\n\n☀️ Um plano personalizado toda manhã às 8h\n🌙 Um check-in toda noite às 21h\n📋 Um resumo todo domingo\n\n*Responda SIM ou NÃO.* Pode parar a qualquer momento com "stop".',
    parseHelp:   'Não consegui ler a idade do seu filho. Pode tentar de novo?',
    fallbackOK:  'Vamos lá! 🎉 Primeiro plano amanhã às 8h.',
    fallbackKO:  'Sem problema, estou aqui. Escreva "reprendre" para ativar.',
  },
};

function getQ(lang, key) {
  return (Q[lang] || Q[DEFAULT_LANG])[key];
}

// ─── New 4-step flow (was 8) ─────────────────────────────────────────────────
const STEPS = [
  { step: 0, field: 'language' },                                  // Lang choice
  { step: 1, field: 'parent_child' },                              // Parent + child + age
  { step: 2, field: 'main_challenge' },                            // Numbered or free text
  { step: 3, field: 'cron_confirm', action: 'GENERATE_PROGRAM' },  // YES/NO
];

const CHALLENGE_MAP = {
  '1': 'sommeil', '2': 'crises', '3': 'écrans',
  '4': 'alimentation', '5': 'école',
};

const langMap = {
  '1': 'fr', '2': 'ar', '3': 'es', '4': 'pt', '5': 'en',
  'fr': 'fr', 'français': 'fr', 'french': 'fr',
  'ar': 'ar', 'arabe': 'ar', 'arabic': 'ar', 'عربية': 'ar', 'عربي': 'ar',
  'es': 'es', 'español': 'es', 'spanish': 'es', 'espagnol': 'es',
  'pt': 'pt', 'português': 'pt', 'portuguese': 'pt', 'portugais': 'pt',
  'en': 'en', 'english': 'en', 'anglais': 'en',
};

const YES_TOKENS = ['oui', 'yes', 'si', 'sí', 'sim', 'نعم', 'ok', 'okay', 'd\'accord', 'go', 'go!', 'allez'];

// ─── Step 1 parser : extract parent + child + age from a single message ─────
/**
 * Parse a free-form "Sarah, mon fils Yassine a 3 ans" into structured fields.
 *
 * Strategy : age via regex, names via capitalized-word heuristic.
 * Returns { parentName, childName, childAge, childAgeMonths } (any may be empty/0).
 *
 * Exported for unit tests.
 */
function parseStep1(text) {
  const t = (text || '').trim();

  // Age (years + months) — multilingual
  const years  = t.match(/(\d+)\s*(?:ans?|year[s]?|سنة|سنين|عام|años?|anos?)/i);
  const months = t.match(/(\d+)\s*(?:mois|month[s]?|شهر|شهور|mes(?:es)?|m[êe]s(?:es)?)/i);
  const childAge = years ? parseInt(years[1], 10) : 0;
  const childAgeMonths = childAge * 12 + (months ? parseInt(months[1], 10) : 0);

  // Capitalized tokens — heuristic for prenoms (works for FR, EN, ES, PT; Arabic uses different cues)
  const properNouns = (t.match(/\b[A-ZÀ-Ý][a-zà-ÿ'\-]{1,30}\b/gu) || [])
    .filter(w => !/^(Mon|My|Mi|Meu|My)$/i.test(w)); // exclude possessives capitalized at start

  // Arabic fallback : extract first 2 word-like sequences > 2 chars
  if (properNouns.length === 0) {
    const arabicWords = (t.match(/[؀-ۿ]{3,}/g) || []);
    arabicWords.forEach(w => properNouns.push(w));
  }

  let parentName = properNouns[0] || '';
  let childName  = properNouns[1] || '';

  return {
    parentName,
    childName,
    childAge,            // in years (rounded down) — for tests
    childAgeMonths,      // precise age
  };
}

// ─── Start onboarding ────────────────────────────────────────────────────────
async function startOnboarding(phone) {
  setState(phone, { step: 'onboarding', onboarding_step: 0 });
  await updateProfile(phone, {
    onboarding_step: 0,
    session_state:   'onboarding',
    language:        DEFAULT_LANG
  });

  const welcome = `👋 Bonjour / مرحبا / Hola / Olá / Hello

Je suis *ParentAtEase* — ton coach parental 🌈

📌 Pour me retrouver sur WhatsApp : envoie *${JOIN_CODE}* au *+1 415 523 8886*

🌍 *Choisis ta langue / اختر لغتك :*

1️⃣ Français
2️⃣ العربية
3️⃣ Español
4️⃣ Português
5️⃣ English`;

  await sendMessage(phone, welcome);
}

// ─── Handle each incoming onboarding message ─────────────────────────────────
async function handleOnboardingMessage(phone, text) {
  const profile     = loadProfile(phone);
  const currentStep = profile?.onboarding_step ?? 0;
  const lang        = profile?.language || DEFAULT_LANG;

  logger.info('Onboarding step', { phone, currentStep, lang });

  const proceed = await applyAnswer(phone, currentStep, text, profile, lang);
  if (!proceed) return true; // re-prompt same step (parse failed)

  const nextStep = currentStep + 1;

  if (nextStep >= STEPS.length || STEPS[nextStep]?.action === 'GENERATE_PROGRAM') {
    // Final step already processed in applyAnswer — generate the welcome plan
    await generateAndSendProgram(phone);
    return false;
  }

  await updateProfile(phone, { onboarding_step: nextStep });
  setState(phone, { step: 'onboarding', onboarding_step: nextStep });

  // Reload language in case step 0 just chose it
  const upd     = loadProfile(phone);
  const updLang = upd?.language || DEFAULT_LANG;
  await sendMessage(phone, getNextQuestion(nextStep, updLang));

  return true;
}

function getNextQuestion(step, lang) {
  switch (step) {
    case 1: return getQ(lang, 'parentChild');
    case 2: return getQ(lang, 'challenge');
    case 3: return getQ(lang, 'confirm');
    default: return getQ(lang, 'parentChild');
  }
}

// ─── Apply answer ────────────────────────────────────────────────────────────
/** Returns true if answer was accepted; false to re-prompt same step. */
async function applyAnswer(phone, answeredStep, text, profile, lang) {
  const updates = { ...profile };

  switch (answeredStep) {
    case 0: {
      const normalized = (text || '').trim().toLowerCase();
      const chosen = langMap[normalized] || langMap[text?.trim?.()] || DEFAULT_LANG;
      updates.language = chosen;
      break;
    }

    case 1: {
      const parsed = parseStep1(text);
      if (!parsed.childAgeMonths) {
        // Couldn't extract age — re-prompt
        await sendMessage(phone, getQ(lang, 'parseHelp'));
        return false;
      }
      updates.parent = { ...(updates.parent || {}), name: parsed.parentName };
      updates.children = [{
        name:              parsed.childName,
        age_months:        parsed.childAgeMonths,
        personality:       '',
        special_needs:     'none',
        health_conditions: 'none',
        in_school:         parsed.childAge >= 3,
        screen_time_hours: 0,
        sleep_bedtime:     '21:00',
        sleep_wake:        '07:00',
      }];
      break;
    }

    case 2: {
      const t = (text || '').trim();
      const mapped = CHALLENGE_MAP[t];
      updates.challenges = [mapped || t]; // start with 1 main challenge; LLM enriches later
      break;
    }

    case 3: {
      const t = (text || '').trim().toLowerCase();
      const cronOn = YES_TOKENS.some(y => t.startsWith(y));
      updates.cron_active = cronOn ? 1 : 0;
      updates.onboarding_complete = 1;
      updates.session_state = 'idle';
      break;
    }
  }

  await updateProfile(phone, updates);
  return true;
}

// ─── Generate welcome program ────────────────────────────────────────────────
async function generateAndSendProgram(phone) {
  const profile = loadProfile(phone);
  const lang    = profile?.language || DEFAULT_LANG;

  await updateProfile(phone, {
    onboarding_complete: 1,
    session_state:       'idle',
    onboarding_step:     STEPS.length,
  });
  clearState(phone);

  // If the user said NO to cron, send a soft fallback instead of generating a plan
  if (!profile?.cron_active) {
    await sendMessage(phone, getQ(lang, 'fallbackKO'));
    return;
  }

  const programPrompt = `
PROFIL : ${JSON.stringify({
    parent:     profile.parent,
    children:   profile.children,
    challenges: profile.challenges,
    language:   profile.language,
  }, null, 2)}

L'onboarding rapide est terminé (juste 3 questions). Génère un message de bienvenue qui :
1. Confirme le prénom de l'enfant + son âge
2. Dit qu'on va commencer par le défi principal mentionné
3. Explique brièvement le rythme (plan 8h, check-in 21h, bilan dimanche)
4. Termine par "Prêt(e) ? 💪"

Max 150 mots. Langue OBLIGATOIRE : ${lang}.
Pas de markdown complexe (WhatsApp).
  `.trim();

  try {
    const message = await callAI(systemPrompt, programPrompt);
    await sendMessage(phone, message);
  } catch (err) {
    logger.error('Failed to generate welcome program', { phone, error: err.message });
    await sendMessage(phone, getQ(lang, 'fallbackOK'));
  }
}

module.exports = {
  startOnboarding,
  handleOnboardingMessage,
  parseStep1,         // exported for tests
  STEPS,              // exported so consumers can introspect the flow length
};
