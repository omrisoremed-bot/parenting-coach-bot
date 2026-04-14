# Sommaire — ParentEase (multi-canal)
> Dernière mise à jour : 2026-04-14 (Phases 1–4 livrées en MVP)

## Description
**ParentEase** est un coach parental IA multi-canal : bot WhatsApp en production, bot Telegram en préparation, webapp parent, blog SEO et moteur de contenu social. Tous les canaux partagent le même cerveau (profil, IA, base de connaissances) via une couche service mutualisée.

**Stack cœur :** Node.js 18 + Express + `better-sqlite3` + Claude/NVIDIA NIM + Groq Whisper + Railway.

---

## 📚 Documents de référence

| Document | Rôle |
|----------|------|
| `PRD.md` | **PRD v2 multi-canal** — vision produit, recherche OSS, roadmap 5 phases |
| `PRD-v1-whatsapp.md` | Archive du PRD v1 (WhatsApp-only) |
| `CLAUDE_SKILLS.md` | Cartographie des skills Claude Code à utiliser par phase |
| `README.md` | Guide d'installation 20 étapes du bot WhatsApp |
| `tasks/todo.md` | État des tâches en cours (créer si absent) |
| `tasks/lessons.md` | Leçons apprises (créer si absent) |

---

## 🧩 Composants produit

| # | Composant | Statut | Localisation |
|---|-----------|--------|--------------|
| A | **Landing page** (5 langues) | ✅ Prod | `landing/` → GitHub Pages |
| B | **Bot WhatsApp** | ✅ Prod | `bot.js`, `handlers/`, `services/` → Railway |
| C | **Bot Telegram** | ✅ Prod (MVP) | `services/telegramService.js` + `messengerAdapter.js` → `@ParentEasebot` |
| D | **Webapp parent** | ✅ MVP v1 | `webapp/` (vanilla JS) + `handlers/webappApi.js` — OTP login via bot |
| E | **Blog CMS** | 🔄 Génération IA v1 | `scripts/generate-article.js` (LLM) → `landing/blog/drafts/` |
| F | **Moteur social** | 📋 Phase 4b | `scripts/article-to-social.js` *(à créer)* |
| G | **Knowledge base** | ✅ Enrichi | 8 fichiers `.md` + 6 PDFs académiques (auto-parsés via `npm run knowledge:build`) |

---

## 🗂️ Fichiers clés (existants)

### Backend WhatsApp bot
| Fichier | Rôle |
|---------|------|
| `bot.js` | Serveur Express principal + webhooks Twilio/Meta |
| `start.js` | Entry point production |
| `test-bot.js` | Script de test local |
| `handlers/messageHandler.js` | Routage des messages entrants + commandes utilisateur |
| `handlers/onboardingFlow.js` | Onboarding multilingue 8 étapes |
| `handlers/profileLoader.js` | Chargement/sauvegarde profils |
| `handlers/adminHandler.js` | API REST admin |
| `services/aiService.js` | Wrapper LLM + `loadKnowledgeBase()` (md + PDF cache) |
| `services/transcriptionService.js` | Transcription audio Groq Whisper |
| `services/whatsappService.js` | Envoi messages Twilio + Meta Cloud API |
| `services/telegramService.js` | Wrapper grammY Telegram (**Phase 1**) |
| `services/messengerAdapter.js` | Routage multi-canal par préfixe `tg:` (**Phase 1**) |
| `services/database.js` | Accès SQLite — users + conversation_history + otp_codes + sessions |
| `services/sessionManager.js` | Sessions utilisateur (bot, in-memory) |
| `services/logger.js` | Winston logger |
| `handlers/webappApi.js` | API REST webapp : OTP, sessions, /me, /history (**Phase 2**) |
| `cron/index.js` | Init cron jobs |
| `cron/morningPlan.js` | Plan matinal 08h00 |
| `cron/eveningCheckin.js` | Check-in soir 21h00 |
| `cron/weeklyReview.js` | Bilan dimanche 19h00 |
| `agents/SOUL.md` | Méthodologie de coaching (injecté dans prompt) |
| `agents/IDENTITY.md` | Personnalité du bot |
| `knowledge/*.md` | Base de connaissances éditoriale (8 fichiers) |
| `knowledge/*.pdf` | 6 études académiques (parsées vers `.pdf-cache.md`) |
| `knowledge/.pdf-cache.md` | Cache généré — *gitignored*, régénéré par postinstall |
| `data/parenting_coach.db` | SQLite WAL |
| `scripts/migrate-json-to-sqlite.js` | Migration historique |
| `scripts/generate-article.js` | Générateur d'articles blog IA (**Phase 3**) |
| `scripts/build-knowledge-cache.js` | Parse PDFs → markdown cache (**Phase 4**) |

### Webapp parent (Phase 2)
| Fichier | Rôle |
|---------|------|
| `webapp/index.html` | Login OTP (formulaire phone → code) |
| `webapp/dashboard.html` | Dashboard profil + enfants + défis + bilans + historique |
| `webapp/app.js` | Auth flow + appels API + rendering (vanilla JS) |
| `webapp/styles.css` | Design tokens ParentEase, mobile-first |

### Landing page + blog
| Fichier | Rôle |
|---------|------|
| `landing/index.html` | Landing FR (source) |
| `landing/en/index.html` | Landing EN |
| `landing/es/index.html` | Landing ES |
| `landing/pt/index.html` | Landing PT |
| `landing/ar/index.html` | Landing AR (RTL) |
| `landing/blog/*.html` | 6 articles SEO |
| `gen_lang.py` | Générateur pages multilingues |

---

## 📦 Stack technique (actuelle)

- **Runtime :** Node.js 18+, Express.js
- **AI :** NVIDIA NIM (Mistral Large 2) — migration Claude Sonnet 4.6 prévue Phase 2
- **Messagerie :** Twilio Sandbox (dev) / Meta Cloud API (prod)
- **Transcription :** Groq Whisper (`whisper-large-v3-turbo`)
- **Stockage :** SQLite WAL (`better-sqlite3`)
- **Scheduling :** `node-cron`
- **Logs :** Winston
- **Déploiement :** Railway (`parenting-coach-production-6c1b.up.railway.app`)
- **Landing :** GitHub Pages (branche `gh-pages`)

---

## 🗺️ Roadmap par phase (résumé — voir PRD.md pour détails)

| Phase | Objectif | Statut |
|-------|---------|--------|
| **0** | WhatsApp bot prod + landing 5 langues + blog 6 articles | ✅ DONE |
| **1** | Bot Telegram MVP (parité WhatsApp, réutilise 100% backend) | ✅ DONE (@ParentEasebot) |
| **2** | Webapp parent (dashboard read-only, auth OTP via bot) | ✅ MVP v1 (vanilla JS) |
| **3** | Génération d'articles IA | ✅ v1 (`npm run article`) — Astro+Decap à faire |
| **4a** | Knowledge PDFs intégrés au prompt système | ✅ DONE (6 PDFs, 131K chars) |
| **4b** | Moteur contenu social (writer/editor/visual agents → Postiz) | 📋 Planifiée |
| **5** | Monétisation freemium + Mem0 + multi-enfants | 📋 Planifiée |

---

## 🎛️ Variables d'environnement

| Variable | Usage | Obligatoire |
|----------|-------|-------------|
| `PROVIDER` | `twilio` / `meta` / *(à venir)* `telegram` | ✅ |
| `NVIDIA_API_KEY` / `AI_API_KEY` | LLM principal | ✅ |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_NUMBER` | Dev/sandbox | ⚠️ |
| `META_ACCESS_TOKEN` + `PHONE_NUMBER_ID` + `VERIFY_TOKEN` | Prod WhatsApp | ⚠️ |
| `GROQ_API_KEY` | Transcription audio | ⚠️ |
| `ADMIN_TOKEN` | API admin | Recommandé |
| `TIMEZONE` | Défaut `Africa/Casablanca` | Optionnel |
| `TELEGRAM_BOT_TOKEN` | Phase 1 — `@ParentEasebot` | ✅ Set |
| `ARTICLE_MODEL` | Phase 3 — override modèle pour `generate-article.js` | Optionnel |
| `LANGFUSE_SECRET_KEY` | Observabilité (Phase 5) | 📋 À venir |
| `FAL_KEY` | Phase 4 | 📋 À venir |
| `ELEVENLABS_API_KEY` | Phase 4 | 📋 À venir |
| `POSTIZ_API_KEY` | Phase 4 | 📋 À venir |

---

## 💰 Coût estimé

| Phase | Coût mensuel estimé |
|-------|---------------------|
| Phase 0 (actuel) | ~5 $ (Railway) — reste gratuit sur NVIDIA/Groq |
| Phase 1 (+Telegram) | idem, Telegram gratuit |
| Phase 2 (+Webapp) | idem ou +0 $ (Vercel free) |
| Phase 3 (+Blog CMS) | +~5 $ si migration vers Claude payant |
| Phase 4 (+Social) | +~15–25 $ (Fal.ai + ElevenLabs + Postiz Railway) |

---

## 🌐 URLs en production

- **Bot WhatsApp (webhook) :** `https://parenting-coach-production-6c1b.up.railway.app/webhook`
- **Bot Telegram (webhook) :** `https://parenting-coach-production-6c1b.up.railway.app/webhook/telegram`
- **Bot Telegram (user-facing) :** https://t.me/ParentEasebot
- **Webapp parent :** `https://parenting-coach-production-6c1b.up.railway.app/webapp/`
- **API webapp :** `https://parenting-coach-production-6c1b.up.railway.app/api/`
- **Health check :** `https://parenting-coach-production-6c1b.up.railway.app/health`
- **Landing publique :** `https://omrisoremed-bot.github.io/parenting-coach-bot/`
- **Landing EN :** `/en/`, **ES :** `/es/`, **PT :** `/pt/`, **AR :** `/ar/`
- **Repo GitHub :** `omrisoremed-bot/parenting-coach-bot`

---

## 📖 Blog — articles existants

| Article | Slug | Auteur | Mot-clé |
|---------|------|--------|---------|
| Crises de colère enfant | `crises-colere-enfant.html` | Dr. Amina Benali | crises de colère enfant techniques |
| Style parental autoritatif | `style-parental-autoritatif.html` | Sophie Marchand | style parental autoritatif enfant |
| Attachement sécure bébé | `attachement-secure-bebe.html` | Youssef El Khatib | attachement sécure bébé développement |
| Écrans et développement | `ecrans-enfants-developpement.html` | Dr. Amina Benali | écrans enfants développement cognitif |
| Communication parent-ado | `communication-parents-adolescents.html` | Sophie Marchand | communication parents adolescents |
| Sommeil enfant | `sommeil-enfant-developpement.html` | Youssef El Khatib | sommeil enfant développement |

---

## 🔌 Skills Claude Code prioritaires

Voir `CLAUDE_SKILLS.md` pour le mapping détaillé. Priorités :

1. **`claude-api`** — prompt caching pour tous nos appels Claude (90% d'économies sur les prompts système)
2. **`superpowers-*`** — discipline de travail (brainstorm → plan → TDD → verification)
3. **`feature-dev:feature-dev`** — pipeline nouvelle feature
4. **`blog-writing-guide` + `seo`** — Phase 3
5. **Claude Agent SDK + `mcp-builder`** — Phase 4

---

## ✅ Status global

- **Phase 0** : ✅ Actif — bot WhatsApp en prod, landing déployée, blog live
- **Phase 1** : ✅ Livré — `@ParentEasebot` répond en prod via `messengerAdapter`
- **Phase 2** : ✅ MVP v1 — webapp vanilla JS + OTP auth, `/webapp/` live sur Railway
- **Phase 3** : ✅ v1 — `npm run article -- --topic "..."` génère un brouillon SEO dans `landing/blog/drafts/`
- **Phase 4a** : ✅ Livré — 6 PDFs académiques parsés et injectés dans le system prompt (131K chars)
- **Phase 4b (social)** : 📋 Planifiée — writer/editor/visual agents → Postiz
- **Phase 5** : 📋 Planifiée — monétisation freemium + Mem0 + multi-enfants

### Commandes utiles

```bash
# Lancer le bot en local
npm run dev

# Générer un article blog
npm run article -- --topic "Gérer les crises du coucher chez les 3 ans" --author "Dr. Amina Benali"

# Régénérer le cache knowledge base (après ajout d'un PDF)
npm run knowledge:build
```

### TODO résiduel avant d'attaquer Phase 4b
- [ ] **Révoquer le token Telegram exposé** dans le chat (`/revoke` sur @BotFather) puis remettre le nouveau sur Railway
- [ ] Commandes Telegram natives (`/start`, `/help`, `/profil`, `/stop`)
- [ ] Support notes vocales Telegram (file_id → Groq Whisper)
- [ ] Version Astro de la webapp si besoin d'un vrai CMS/SSR
- [ ] Pipeline de review SEO auto sur les drafts générés par `npm run article`
