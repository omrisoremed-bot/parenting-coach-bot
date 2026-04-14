# PRD — ParentEase (multi-canal)
> Version 2.0 — 2026-04-14
> Remplace l'ancien PRD WhatsApp-only (archivé sous `PRD-v1-whatsapp.md`)

---

## 1. Vision produit

**ParentEase** est un coach parental IA accessible **partout où les parents se trouvent déjà** : WhatsApp, Telegram, web. Chaque canal partage le même cerveau (profil, mémoire, base de connaissances), la même méthodologie de coaching, et la même IA. En parallèle, un blog et un moteur de contenu social alimentent l'acquisition.

**Promesse produit :**
> Un plan parental personnalisé chaque matin, une présence bienveillante 24h/24, en 5 langues — sans app à installer.

**Positionnement concurrentiel :**
- Woebot / Wysa → santé mentale adulte, closed-source, payant
- Koko → peer-support communautaire, pas de coaching individuel
- Headspace for Parents / Lovevery → contenu éditorial, pas d'IA conversationnelle
- **ParentEase** → IA conversationnelle + plans quotidiens + multi-canal + OSS stack

---

## 2. Périmètre fonctionnel (5 composants)

| # | Composant | État | Priorité |
|---|-----------|------|----------|
| A | **Landing page multilingue** (5 langues) | ✅ Déployée (GitHub Pages) | DONE |
| B | **Bot WhatsApp** | ✅ En prod (Railway) | DONE — maintenance |
| C | **Bot Telegram** | 🆕 | **Phase 1** |
| D | **Webapp parent** (dashboard) | 🆕 | Phase 2 |
| E | **Blog + CMS** | Partiel (6 articles) | Phase 3 |
| F | **Moteur contenu social** | 🆕 | Phase 4 |

Principe d'itération : pour **chaque nouveau composant**, livrer d'abord un **MVP minimal qui marche de bout en bout** (vaut mieux une v0 laide qui tourne qu'une v1 parfaite qui traîne), puis itérer.

---

## 3. Recherche — projets OSS et outils similaires

### 3.1 Frameworks de bots de messagerie

| Domaine | Outil OSS | Langage | Notes |
|---------|-----------|---------|-------|
| WhatsApp officiel | **Meta Cloud API** (REST) | — | Gratuit 1000 msg/j. Templates obligatoires hors fenêtre 24h. Déjà intégré. |
| WhatsApp officiel | **Twilio WhatsApp API** | REST | Sandbox gratuit. Prod payant. Déjà intégré. |
| WhatsApp non-officiel | **Baileys** (`WhiskeySockets/Baileys`) | TypeScript | WebSocket direct. Risque ban. Bon pour self-hosting total. |
| WhatsApp non-officiel | **whatsapp-web.js** | Node | Puppeteer. Instable. |
| WhatsApp client Python | **pywa** (`david-lev/pywa`) | Python | Wrapper Cloud API propre. |
| Telegram | **grammY** (`grammyjs/grammY`) | TS/JS | ⭐ Recommandé — moderne, plugins, sessions, typé. |
| Telegram | **telegraf** | Node | Plus ancien que grammY, large écosystème. |
| Telegram | **python-telegram-bot** | Python | Référence Python, très mature. |
| Telegram | **aiogram** | Python (async) | Alternative async moderne. |
| Telegram | **Pyrogram / Telethon** | Python | Client MTProto (userbots). Pas notre cas. |

**Décision Phase 1 :** **grammY** (TypeScript/Node) — permet de **réutiliser tel quel** les services `aiService`, `transcriptionService`, `database` du bot WhatsApp actuel. Pas de duplication de logique.

---

### 3.2 Frameworks d'agents IA / orchestration LLM

| Outil | Langage | Usage pertinent |
|-------|---------|-----------------|
| **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) | TS/Py | Orchestration multi-tool, sub-agents, hooks. Idéal pour les jobs de content generation. |
| **LangGraph** (`langchain-ai/langgraph`) | Python | Graphes d'états pour workflows long terme (ex: onboarding multi-étapes, génération d'articles). |
| **CrewAI** (`crewAIInc/crewAI`) | Python | Équipes d'agents spécialisés (idéal pour le moteur social : writer + editor + visual). |
| **OpenAI Agents SDK** | Python/TS | Alternative propriétaire. |
| **AutoGen** (Microsoft) | Python | Multi-agent conversation. Plus lourd. |
| **Mastra** (`mastra-ai/mastra`) | TS | Framework TS propre pour agents, workflows, RAG. Alternative 100% JS. |

**Décision :** Pas besoin en Phase 1 (bot Telegram = simple pass-through). En Phase 4 (contenu social) → **Claude Agent SDK** + sub-agents (1 agent writer, 1 agent editor, 1 agent visual prompt).

---

### 3.3 Mémoire longue et RAG

| Outil | Type | Notes |
|-------|------|-------|
| **Mem0** (`mem0ai/mem0`) | Mémoire sémantique | Stocke préférences, habitudes parent/enfant. API simple. |
| **Zep** (`getzep/zep`) | Graphe temporel | Trace l'évolution (ex: "l'enfant X dormait mal en mars"). Plus complexe. |
| **Cognee** (`topoteretes/cognee`) | Memory layer OSS | Jeune, prometteur. |
| **LlamaIndex** (`run-llama/llama_index`) | RAG framework | Référence Python. Beaucoup d'intégrations. |
| **LangChain** | RAG/chain | Trop lourd pour nos besoins. |
| **Haystack** (`deepset-ai/haystack`) | RAG prod-ready | Alternative mature. |
| **Chroma** (`chroma-core/chroma`) | Vector DB | Léger, embarquable Node+Python. |
| **LanceDB** | Vector DB | Rust/JS, très rapide, fichier local. |
| **sqlite-vec** | Extension SQLite | ⭐ **Idéal pour nous** — vecteurs dans notre DB existante, zéro service externe. |

**Décision :** Pour la v1 du RAG blog/knowledge → **sqlite-vec** (garde le stack SQLite existant). Pour la mémoire long terme parent → **Mem0** en Phase 2.

---

### 3.4 Webapp (dashboard parent)

| Outil | Notes |
|-------|-------|
| **Next.js 15** (App Router) | ⭐ Référence React full-stack. Vercel gratuit. |
| **Astro** | Idéal blog + îlots interactifs. Léger. Déjà utilisé pour landing. |
| **SvelteKit** | Alternative légère. |
| **Remix** → Fusionne avec React Router v7 | |
| **FastAPI + HTMX** | Si on passe côté Python. |
| **Pocketbase** (`pocketbase/pocketbase`) | Backend 100% en un binaire Go : auth, realtime, fichiers. SQLite embarqué. |
| **Supabase** | Backend OSS (Postgres + auth + storage). Très complet. |
| **Clerk / Auth.js / Lucia** | Auth. Clerk = SaaS, Auth.js = OSS. |

**Décision Phase 2 :** **Astro** (landing déjà en Astro-compatible) + **îlot React** pour le dashboard + auth **phone OTP via WhatsApp bot existant** (zéro nouveau service auth).

---

### 3.5 Blog / CMS

| Outil | Type | Notes |
|-------|------|-------|
| **Astro** | SSG + content collections | ⭐ Idéal : déjà dans notre stack. |
| **Ghost** (`TryGhost/Ghost`) | Node + Handlebars | Très complet mais overkill. |
| **Eleventy (11ty)** | SSG | Ultra léger. |
| **Decap CMS** (ex-Netlify CMS) | CMS Git-based | UI pour éditer markdown via PR. |
| **Tina CMS** | Git-based + visuel | Éditeur WYSIWYG sur markdown. |
| **Payload CMS** (`payloadcms/payload`) | Headless TS | Très puissant, DB requise. |
| **Directus** | Headless no-code | Python/Node, UI admin. |
| **Sanity** (SaaS) | Référence headless | Free tier généreux. |

**Décision Phase 3 :** **Astro content collections** pour le blog + **Decap CMS** pour l'édition no-code (publication via PR GitHub) + **script de génération d'articles Claude** (`scripts/generate-article.js`).

---

### 3.6 Moteur de contenu social (multimédia)

#### Outils de planification/publication

| Outil | Type | Notes |
|-------|------|-------|
| **Postiz** (`gitroomhq/postiz-app`) | OSS, Next.js | ⭐ Scheduler multi-réseaux self-hosted. IG, X, FB, TikTok, LinkedIn, YouTube, Threads, Pinterest. |
| **Mixpost** (`inovector/Mixpost`) | OSS Laravel | Alternative PHP. |
| **Buffer** | SaaS | Free tier : 3 comptes, 10 posts en file. |
| **Typefully** | SaaS | Spécialisé X/Threads, bon éditeur. |
| **Publer** | SaaS | Multi-réseaux, generous free. |
| **n8n** / **Make** / **Latenode** | Workflow orchestrators | Peuvent brancher tout → tout. |

#### Génération de visuels

| Outil | Type | Notes |
|-------|------|-------|
| **Fal.ai** | API | Flux, SDXL, très rapide. Free credits. |
| **Replicate** | API | Large catalogue modèles. Pay-per-run. |
| **Flux.1 [dev]** (local) | Modèle OSS | Meilleure qualité open pour 2025. |
| **Stable Diffusion XL / 3** | Modèle OSS | Classique. |
| **DALL-E 3** (OpenAI) | API | Bonne qualité, payant. |
| **Canva API** | API visuelle | Templates + branding. |
| **Freepik API** | Stock + génération | Option commerciale. |

#### Génération de vidéos courtes

| Outil | Notes |
|-------|-------|
| **Remotion** (`remotion-dev/remotion`) | ⭐ Video-as-React. Idéal pour templates scriptés (quotes + voix off + ken burns). |
| **ShortGPT** (`RayVentura/ShortGPT`) | Pipeline YouTube Shorts/TikTok : script Claude → voix off → visuels → rendu FFmpeg. |
| **MoneyPrinterV2** | Alternative, très populaire. |
| **Captions.ai** / **Opus Clip** | SaaS : recoupe long-form → shorts. |
| **FFmpeg** | Brique de base. |
| **Whisper + forced alignment** | Pour sous-titres karaoké. |

#### Voix synthétique

| Outil | Notes |
|-------|-------|
| **ElevenLabs** | Meilleure qualité. Free tier limité. |
| **Coqui XTTS v2** | OSS, self-host. |
| **Kokoro-82M** | OSS ultra-léger 2025. |
| **Azure / Google TTS** | Solides, commerciaux. |

**Décision Phase 4 (MVP) :**
1. **Postiz** self-hosted (Railway ou Fly.io) → scheduling multi-réseaux
2. **Fal.ai** (Flux Schnell) → visuels carrousels IG
3. **Remotion** → 1 template Short/Reel (quote + voix + kenburns)
4. **Claude API** → génération script/caption/thread depuis un article blog
5. **ElevenLabs** (free) → voix off pour la démo ; ensuite **Kokoro** self-host

---

### 3.7 Observabilité / analytics

| Outil | Notes |
|-------|-------|
| **PostHog** (`PostHog/posthog`) | OSS, analytics + session replay + flags. Self-host possible. |
| **Plausible** (OSS) | Web analytics simple. |
| **Umami** (OSS) | Alternative Plausible. |
| **Sentry** (OSS core) | Erreurs, performance. |
| **Langfuse** (`langfuse/langfuse`) | ⭐ OSS LLM observability — traces, tokens, coûts par utilisateur. |
| **Helicone** | Alternative SaaS LLM obs. |

**Décision :** **Langfuse** (self-hosted Railway) dès Phase 2 pour tracer tous les appels Claude. **Plausible** pour la landing.

---

## 4. Roadmap par phases

### Phase 0 — ✅ ACQUIS (ne pas toucher)
- Bot WhatsApp Node.js stable (Meta/Twilio + Mistral/Claude + Groq Whisper + SQLite) déployé Railway
- Landing page 5 langues (GitHub Pages) avec chat widget Groq
- Blog 6 articles SEO statiques

---

### Phase 1 — Bot Telegram MVP *(prochaine étape)*

**Objectif :** Parité fonctionnelle WhatsApp ↔ Telegram en réutilisant 100% du backend.

**Livrable minimal :**
- [ ] Ajouter `services/telegramService.js` (wrapper grammY) à côté de `whatsappService.js`
- [ ] Créer `services/messengerAdapter.js` qui expose une interface commune `{send(to, text), onMessage(cb)}` et route vers Twilio/Meta/Telegram selon `process.env.PROVIDER`
- [ ] Webhook Telegram `/webhook/telegram` dans `bot.js`
- [ ] Stocker l'ID Telegram dans `users` table SQLite (colonne `telegram_id` ajoutée par migration)
- [ ] Reproduire onboarding (réutilise `onboardingFlow.js` — déjà agnostique du canal)
- [ ] Cron jobs : itérer sur users et envoyer via le bon provider
- [ ] Tester : rejoindre depuis Telegram, compléter profil, recevoir plan matinal

**Out of scope MVP :** Inline keyboards, voice messages (Telegram audio = OGG Opus, compatible Groq Whisper — à activer v2), payments.

**Déploiement :** même service Railway, nouveau webhook chez `api.telegram.org`.

---

### Phase 2 — Webapp parent MVP

**Objectif :** Un dashboard web read-only où le parent voit son profil, son historique de messages et son état d'abonnement.

**Livrable minimal :**
- [ ] Nouveau dossier `webapp/` — Astro + îlot React
- [ ] Route `/login` : saisir numéro → bot WhatsApp/Telegram envoie OTP 6 chiffres → cookie session JWT 30j
- [ ] Route `/dashboard` : profil (enfant âge, défis, langue), 20 derniers messages, prochains crons programmés
- [ ] Backend : reuse `better-sqlite3` via une route Express `/api/me` protégée par JWT
- [ ] Déployer sur Railway (même service que bot) ou séparer sur Vercel
- [ ] Langfuse branché sur `aiService.js`

**Out of scope MVP :** Édition profil web (se fait encore via WhatsApp), visuels, paiement.

---

### Phase 3 — Blog CMS + génération IA

**Objectif :** Passer de 6 articles HTML hardcodés à un flux durable (≥2 articles/semaine) sans écrire chaque article à la main.

**Livrable minimal :**
- [ ] Migrer `landing/blog/*.html` → `webapp/src/content/blog/*.md` (Astro content collections)
- [ ] Composants Astro `<BlogLayout>`, `<BlogCard>` réutilisant le design existant
- [ ] `scripts/generate-article.js` : prend `{topic, keyword, lang, author}` → plan → rédaction Claude avec prompt caching → vérif SEO (H1/H2/meta) → écrit `.md` → ouvre une PR GitHub
- [ ] **Decap CMS** monté sur `/admin` pour édition/validation no-code (publie via PR sur `main`)
- [ ] Sitemap + RSS générés par Astro
- [ ] Langfuse : coût/article tracké

**Out of scope MVP :** Traductions automatiques des articles (Phase 3.5), commentaires, recherche full-text.

---

### Phase 4 — Moteur de contenu social

**Objectif :** À partir d'un article blog, générer et publier automatiquement **1 post IG + 1 thread X + 1 Short/Reel vidéo** par semaine.

**Livrable minimal :**
- [ ] Script `scripts/article-to-social.js` :
  1. Lit un `.md` d'article
  2. **Agent writer (Claude)** → 5 hooks, 3 CTA, 10 bullets
  3. **Agent editor** → choisit la version finale par plateforme (IG carousel 6 slides, X thread 5 tweets, caption TikTok 80 mots)
  4. **Agent visual** → prompts Flux pour visuels carrousel
  5. **Fal.ai Flux Schnell** → génère 6 visuels
  6. **Remotion** → rend un Short 30s (quote + voix off ElevenLabs + ken burns sur visuels)
  7. Pousse tout dans **Postiz** via son API → planifie à 12h
- [ ] Déployer Postiz sur Railway
- [ ] 1 template Remotion `ParentingQuoteShort.tsx` (prêt à l'emploi)
- [ ] Cron weekly : lundi 9h, traite le dernier article non-publié

**Out of scope MVP :** Long-form YouTube, podcast, analytics social, A/B testing hooks.

---

### Phase 5 — Consolidation & monétisation *(plus tard)*
- Freemium : 5 messages/jour gratuit, illimité payant (Stripe)
- Mem0 pour mémoire long terme
- Dashboard édition profil
- Multi-enfants
- WhatsApp Business officiel (BSP)
- Traductions automatiques des articles
- Langfuse alerting (coût/jour)

---

## 5. Architecture cible (Phases 1–4)

```
                ┌─────────────────────────────────────────┐
                │           UTILISATEURS                  │
                │  WhatsApp  ·  Telegram  ·  Webapp       │
                └────────┬───────────┬──────────┬─────────┘
                         │           │          │
                         ▼           ▼          ▼
                ┌─────────────────────────────────────────┐
                │         messengerAdapter.js             │
                │  (whatsappService / telegramService)    │
                └────────────────┬────────────────────────┘
                                 ▼
                ┌─────────────────────────────────────────┐
                │         handlers/messageHandler         │
                │  onboardingFlow · profileLoader · cmds  │
                └────────────────┬────────────────────────┘
                                 ▼
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  aiService.js          transcriptionSvc          database.js
  Claude/NIM             Groq Whisper           better-sqlite3
        │                        │                        │
        │                        │                        ▼
        │                        │              users · messages · crons
        ▼                        │                        │
  Langfuse (obs)                 │                        │
        │                        ▼                        │
        │              knowledge/*.md + sqlite-vec ──────►│
        │              (RAG base)                          │
        │                                                  │
        └──────────────┐                                   │
                       ▼                                   │
           Claude Agent SDK                                │
     (writer · editor · visual agents)                     │
                       │                                   │
                       ▼                                   │
              Fal.ai Flux    Remotion    ElevenLabs        │
                       │        │            │             │
                       └────────┴────────────┘             │
                                │                          │
                                ▼                          │
                         Postiz scheduler ◄────────────────┘
                                │
                                ▼
            IG · X · TikTok · FB · YouTube · Threads
```

---

## 6. Stack recommandée par phase

| Composant | Phase 1 (Telegram) | Phase 2 (Webapp) | Phase 3 (Blog CMS) | Phase 4 (Social) |
|-----------|-------------------|------------------|--------------------|------------------|
| Runtime | Node 18+ | Node 18+ | Node 18+ | Node 18+ |
| Bot Telegram | **grammY** | — | — | — |
| Frontend | — | Astro + React | Astro content coll. | — |
| Auth | — | JWT + OTP WhatsApp | — | — |
| DB | `better-sqlite3` | idem | idem + **sqlite-vec** | idem |
| LLM | Claude Sonnet 4.6 | idem | idem (+ prompt cache) | idem + **Claude Agent SDK** |
| Observability | — | **Langfuse** | Langfuse | Langfuse |
| CMS | — | — | **Decap CMS** | — |
| Images | — | — | — | **Fal.ai** (Flux Schnell) |
| Vidéo | — | — | — | **Remotion** |
| Voix | — | — | — | ElevenLabs → Kokoro |
| Scheduler social | — | — | — | **Postiz** |
| Scheduler interne | node-cron | node-cron | node-cron | node-cron |
| Hosting | Railway | Railway + Vercel | idem | idem + Postiz Railway |

---

## 7. Métriques de succès par phase

| Phase | Métrique clé | Cible MVP |
|-------|-------------|-----------|
| 1 Telegram | % users Telegram complétant onboarding | >60% |
| 2 Webapp | DAU webapp / DAU bot | >15% |
| 3 Blog CMS | Temps pour publier 1 article (brouillon→prod) | <20 min |
| 3 Blog CMS | Articles publiés/semaine | ≥2 |
| 4 Social | Posts générés et publiés/semaine | ≥3 (IG + X + TikTok) |
| 4 Social | Coût marginal / post (API + compute) | <0,15 $ |

---

## 8. Prochaines actions immédiates

**Ordre d'exécution proposé :**

1. **(Cette session)** Valider ce PRD, `CLAUDE_SKILLS.md`, `SOMMAIRE.md`
2. **Phase 1.0** — Créer la branche `feat/telegram-mvp`, ajouter grammY, wrapper `telegramService.js`, webhook
3. **Phase 1.1** — Refactoriser `whatsappService.js` derrière `messengerAdapter.js`
4. **Phase 1.2** — Tester onboarding Telegram bout-en-bout
5. **Phase 1.3** — Migrer les 3 crons pour envoyer via l'adapter
6. **Go/No-Go** → Phase 2

**Chaque phase suit le même pattern :**
- `superpowers-brainstorming` → options + trade-offs
- `superpowers-writing-plans` → plan d'implémentation détaillé
- `feature-dev:feature-dev` → architecture + blueprint
- Implémentation TDD (`superpowers-tdd`)
- `superpowers-verification` avant de marquer terminé
- `open-pr` + `multi-ai-code-review`

---

## 9. Références OSS étoilées (liens)

| Projet | Repo | Phase |
|--------|------|-------|
| grammY | `grammyjs/grammY` | 1 |
| Baileys | `WhiskeySockets/Baileys` | 0 (fallback) |
| Langfuse | `langfuse/langfuse` | 2 |
| Mem0 | `mem0ai/mem0` | 5 |
| sqlite-vec | `asg017/sqlite-vec` | 3 |
| LlamaIndex | `run-llama/llama_index` | 3 |
| Astro | `withastro/astro` | 2, 3 |
| Decap CMS | `decaporg/decap-cms` | 3 |
| Pocketbase | `pocketbase/pocketbase` | 2 (alt) |
| PostHog | `PostHog/posthog` | 5 |
| Postiz | `gitroomhq/postiz-app` | 4 |
| Remotion | `remotion-dev/remotion` | 4 |
| ShortGPT | `RayVentura/ShortGPT` | 4 (ref) |
| Claude Agent SDK | `anthropics/claude-agent-sdk-python` / `-typescript` | 4 |
| CrewAI | `crewAIInc/crewAI` | 4 (alt) |
| LangGraph | `langchain-ai/langgraph` | 4 (alt) |

---

## 10. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Ban WhatsApp (Baileys) | Haut | On reste sur Meta Cloud API officielle |
| Meta template rejection | Moyen | Garder version non-template dans fenêtre 24h |
| Quota Groq/NVIDIA épuisé | Moyen | Fallback Claude (déjà supporté) |
| Coût Fal.ai explose | Moyen | Cache images + passer à Flux local |
| Coût ElevenLabs | Bas | Fallback Kokoro self-host |
| Postiz auto-hébergé instable | Moyen | Fallback Buffer free tier |
| RGPD données enfants | Haut | Minimiser stockage (pas de prénom enfant), droit à l'effacement via commande `RESET` |
| WhatsApp 24h window bloque les réponses | Moyen | Templates pré-approuvés pour cron |

---

*PRD généré 2026-04-14 — à réviser à chaque fin de phase.*
*v1 (WhatsApp-only) préservée sous `PRD-v1-whatsapp.md`.*
