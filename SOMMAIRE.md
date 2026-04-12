# Sommaire — Parenting Coach IA
> Dernière mise à jour : 2026-04-12

## Description
Bot WhatsApp de coaching parental propulsé par IA (Mistral Large via NVIDIA NIM). Conseils personnalisés quotidiens, onboarding multilingue (FR/AR/Darija/EN), transcription audio, base de connaissances, et réponses adaptées à la religion/culture de chaque famille.

## Fichiers Clés
| Fichier | Rôle |
|---------|------|
| `bot.js` | Serveur Express principal + webhooks Twilio |
| `handlers/messageHandler.js` | Routage des messages entrants + commandes |
| `handlers/onboardingFlow.js` | Onboarding multilingue 8 étapes (langue + profil) |
| `handlers/adminHandler.js` | Commandes administrateur |
| `services/aiService.js` | Wrapper NVIDIA NIM (Mistral Large) |
| `services/transcriptionService.js` | Transcription audio via Groq Whisper |
| `services/whatsappService.js` | Envoi messages Twilio |
| `services/sessionManager.js` | Gestion des sessions utilisateurs |
| `cron/morningPlan.js` | Message automatique 08h00 |
| `cron/eveningCheckin.js` | Check-in automatique 21h00 |
| `cron/weeklyReview.js` | Bilan hebdo dimanche 19h00 |
| `agents/SOUL.md` | Méthodologie de coaching |
| `agents/IDENTITY.md` | Personnalité du bot |
| `knowledge/` | Base de connaissances (fichiers .md chargés au démarrage) |
| `users/` | Profils utilisateurs JSON |
| `PRD.md` | Roadmap fonctionnelle + comparatif outils |

## Stack Technique
- **Runtime :** Node.js 18+, Express.js
- **AI :** NVIDIA NIM — `mistralai/mistral-large-2-instruct`
- **Messagerie :** Twilio WhatsApp Sandbox (dev) / Meta Cloud API (prod)
- **Transcription :** Groq Whisper (`whisper-large-v3-turbo`)
- **Stockage :** SQLite WAL (`better-sqlite3`) — migration JSON→SQLite complète
- **Logs :** Winston
- **Scheduling :** node-cron → BullMQ prévu v2
- **Déploiement :** Railway (service `parenting-coach-production-6c1b.up.railway.app`)

## Fonctionnalités actives
- [x] Onboarding multilingue 8 étapes (FR / AR / Darija / EN)
- [x] Reformulation de la problématique avant chaque réponse
- [x] Réponses religion/culture-aware (profil utilisateur)
- [x] Base de connaissances `.md` injectée dans le prompt
- [x] Messages matinaux automatiques (plan de la journée)
- [x] Check-in soir automatique
- [x] Bilan hebdomadaire
- [x] Coaching libre (Q&A)
- [x] Transcription audio / messages vocaux (Groq Whisper)
- [x] Profils multi-utilisateurs
- [x] Déploiement Railway 24/7

## Roadmap (voir PRD.md pour détails)
| Étape | Objectif | Statut |
|-------|---------|--------|
| **Étape 1** | MVP stable — corrections + SQLite | 🔄 En cours |
| **Étape 2** | Expérience enrichie — mémoire, objectifs, BullMQ | 📋 Planifiée |
| **Étape 3** | Personnalisation avancée — RAG, Mem0, multi-enfants | 📋 Planifiée |
| **Étape 4** | Scalabilité & monétisation — WhatsApp Business officiel | 📋 Planifiée |

## Variables d'environnement requises
| Variable | Usage | Obligatoire |
|---------|-------|------------|
| `NVIDIA_API_KEY` | LLM Mistral Large | ✅ |
| `TWILIO_ACCOUNT_SID` | API Twilio | ✅ |
| `TWILIO_AUTH_TOKEN` | API Twilio | ✅ |
| `TWILIO_PHONE_NUMBER` | Numéro sandbox Twilio | ✅ |
| `GROQ_API_KEY` | Transcription audio | ⚠️ Requis pour audio |
| `TWILIO_MESSAGING_SERVICE_SID` | Service Twilio | ✅ |

## Coût Estimé
- Railway : gratuit (trial $5) → ~$5/mois ensuite
- NVIDIA NIM : gratuit (quota)
- Groq Whisper : gratuit (quota)
- **Total : ~0–5 $/mois** en phase test

## Déploiement Railway
- **URL :** `parenting-coach-production-6c1b.up.railway.app`
- **Webhook Twilio :** `https://parenting-coach-production-6c1b.up.railway.app/webhook`
- **Health check :** `/health`
- **Repo GitHub :** `omrisoremed-bot/parenting-coach-bot`

## Landing Page (Nour)
- **URL publique :** https://omrisoremed-bot.github.io/parenting-coach-bot/
- **Hébergement :** GitHub Pages (branche `gh-pages`)
- **Nom du bot :** Nour (نور) — "La Lumière"
- **Chatbot landing :** Groq `llama-3.3-70b-versatile` (appel direct navigateur)
- **Blog :** 6 articles SEO/EEAT dans `landing/blog/`

| Article | Auteur | Keyword principal |
|---------|--------|------------------|
| `crises-colere-enfant.html` | Dr. Amina Benali | crises de colère enfant techniques |
| `style-parental-autoritatif.html` | Sophie Marchand | style parental autoritatif enfant |
| `attachement-secure-bebe.html` | Youssef El Khatib | attachement sécure bébé développement |
| `ecrans-enfants-developpement.html` | Dr. Amina Benali | écrans enfants développement cognitif |
| `communication-parents-adolescents.html` | Sophie Marchand | communication parents adolescents conflits |
| `sommeil-enfant-developpement.html` | Youssef El Khatib | sommeil enfant développement heures |

## Status : ✅ Actif — En production sur Railway + Landing sur GitHub Pages
