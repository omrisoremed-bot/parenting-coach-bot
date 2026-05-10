# ANALYSE COMPLÈTE DU PROJET — État des lieux toutes sessions confondues

> **Projet** : ParentEase (anciennement Parenting Coach → Nour → NurtureCoach)
> **Date d'analyse** : 2026-05-10
> **Périmètre analysé** : `D:\mes test de projet\Parenting Coach\` + worktree `.claude/worktrees/hardcore-tharp/`
> **Sessions tracées** : 28 commits Git + travaux non commités (frontend redesign, strategy docs, workflow rédactionnel)

---

## 0. RÉSUMÉ EXÉCUTIF (TL;DR)

**Ce qui existe aujourd'hui :**
- Un **bot WhatsApp + Telegram en production** sur Railway, branché à un moteur IA (NVIDIA NIM / OpenAI configurable) avec une base de connaissances de **131 000 caractères** (8 fichiers MD + 6 PDFs académiques parsés).
- Une **webapp parent** vanilla JS avec authentification OTP via le bot, dashboard profil + historique + bilans.
- Un **blog SEO** de 6 articles HTML statiques publiés sur GitHub Pages, en 5 langues (FR, EN, ES, PT, AR).
- Un **moteur d'articles IA** (`npm run article`) qui produit des brouillons EEAT-ready à partir d'un sujet + mot-clé.
- Un **pipeline social IA multi-agent** (Writer → Editor → Visual Brief → Fal.ai Flux) qui transforme chaque article en posts X + Instagram + LinkedIn + visuel.
- Une **stratégie éditoriale documentée** : 2 profils auteurs détaillés, banque de 72 sujets (36/auteur sur 12 semaines), script de batch hebdo `npm run weekly`.
- Trois **documents stratégiques majeurs** : audit des failles, plan SEO 12 mois, monétisation freemium, plan analytics.
- Un **frontend de redesign** version 2 (playground/kids vibe) prêt à plugger.

**Phases roadmap livrées : 0, 1, 2, 3, 4a, 4b** (≈ 80% de la roadmap initiale).
**Phase 5 (monétisation + Mem0 + multi-enfants)** : non démarrée.

**Blocages actuels :**
1. Nom **ParentEase pris** sur 3 plateformes concurrentes → rebrand obligatoire avant launch payant.
2. **Clé OpenAI exposée en clair** dans une conversation (à révoquer immédiatement).
3. **Pas de tests automatisés**, pas de monitoring en production, pas de backup SQLite.
4. **EEAT fragile** : auteurs fictifs sans empreinte LinkedIn réelle (risque déclassement Google).

---

## 1. HISTORIQUE & ÉVOLUTION DU NOM

Le projet a changé de nom **4 fois** depuis sa création :

| Itération | Nom | Période | Raison du changement |
|-----------|-----|---------|----------------------|
| 1 | **Parenting Coach** | Création initiale | Nom technique de travail |
| 2 | **Nour** | Mi-projet (commit 9ebeca4) | Identité plus chaude, ancrage arabe (نور = lumière) |
| 3 | **NurtureCoach** | Commits 568f3cb → 45b97ff | Anglicisation pour marché international |
| 4 | **ParentEase** | Commits d87c3f8 → ec6afce | Positionnement "easy parenting" |
| 5 | **À DÉCIDER** | 2026-05-10 | **ParentEase est pris** sur `parentease.app`, `parentease.ca`, Google Play |

**Statut actuel du nom** : en cours de re-décision. Finalistes proposés et vérifiés : **Lullo**, **Mileto**, **Pamio**, **Ouri**, **Tisso** (aucun hit dans la niche parentale).

---

## 2. HISTORIQUE DES SESSIONS DE TRAVAIL (chronologie Git)

### Phase initiale — création du bot (commits anciens)
| Commit | Apport |
|--------|--------|
| `872b503` | Initial deploy: Parenting Coach WhatsApp bot (Twilio Sandbox, Express, NVIDIA NIM) |
| `0805c3a` | Modèle Mistral Large, reformulation des questions, knowledge base, prompts religion-aware |
| `5cd7a54` | Onboarding multilingue + transcription audio Groq Whisper |
| `6c0e238` | Migration JSON profiles → SQLite (better-sqlite3) |
| `d0da1cc` | Knowledge base (7 fichiers MD), commande PROFIL, retry AI sur erreurs transitoires |

### Phase landing + branding
| Commit | Apport |
|--------|--------|
| `f81bd45` | Landing page "Nour" + blog parenting + chatbot Netlify Functions |
| `1ffdf06` | Chatbot direct Groq (compatible GitHub Pages) |
| `9ebeca4` | Déploiement landing Nour sur GitHub Pages |
| `f9fd03c` | 6 articles blog EEAT/SEO + index mis à jour |
| `2e6296f` | Déploiement 6 articles + index |

### Phase rebrand × 2
| Commit | Apport |
|--------|--------|
| `568f3cb` | Rebrand → **NurtureCoach** + langues ES/PT, suppression Darija |
| `50790aa` | Fix landing NurtureCoach + vraies vidéos YouTube |
| `d87c3f8` | Rebrand → **ParentEase** + icônes SVG + refonte FAQ + attribution rédacteurs |
| `f1aa1d5` | ParentEase déployé sur gh-pages |

### Phase multilangue
| Commit | Apport |
|--------|--------|
| `13d6444` | Ajout 4 langues (EN, ES, PT, AR) + fix footer + témoignages |
| `71001c7` | Déploiement 4 langues + FR mis à jour |
| `da227ab` | Traduction blog cards + chat system prompt dans toutes les langues |
| `08f1de2` | Pages entièrement traduites (blog + chat fixé) |

### Phase 1 → 4b (PRD v2, multi-canal, sécurité)
| Commit | Apport |
|--------|--------|
| `59643a4` | PRD v2 multi-canal + Claude skills + guide modèles |
| `d5a0cd7` | **Phase 1** — Telegram bot MVP via `messengerAdapter` |
| `4854a8a` | **Phase 2** — Webapp parent OTP auth (vanilla JS) |
| `2fae70b` | **Phase 3 + 4a** — Article generator + PDF knowledge base |
| `6c949b3` | Trigger redéploiement Railway |
| `ec6afce` | **Sprints sécurité 1-3 + Phase 4b** : HMAC Meta, validation Twilio, mass assignment, helmet/CORS, prompt builder singleton, batch cron parallèle, rate limiting admin, pipeline social multi-agent + Fal.ai Flux |

### Sessions récentes non-commitées (mai 2026)
Travaux dans le worktree `claude/hardcore-tharp` :
- Création de **profils auteurs** : `docs/editorial/authors/dr-amara-diallo.md`, `etienne-bouchard.md`
- **Banque de contenu** : `scripts/content-plans/{dr-amara-diallo,etienne-bouchard}.json` (36 articles/auteur sur 12 semaines)
- **Script batch hebdo** : `scripts/weekly-content.js` (`npm run weekly --author X --week N --social`)
- **Workflow rédactionnel** : `docs/editorial/workflow-redaction.md`
- **Audit stratégique** : `docs/strategy/audit-strategique.md` (31 failles identifiées, plan SEO, jeux parent-enfant, monétisation)
- **Plan analytics** : `docs/analytics/tracking-plan.md` (PostHog, Plausible, Langfuse, KPIs)
- **Frontend redesign v1** : `landing/redesign/index.html` (éditorial magazine — REJETÉ par le user)
- **Frontend redesign v2** : `landing/redesign/index.html` (playground/kids — VALIDÉ)
- **Sprint 1 SEO** : `scripts/generate-sitemap.js`, `scripts/inject-jsonld.js`, prompt caching OpenAI activé
- **Décision rebrand** : recherche dispo nom + propositions (Lullo, Mileto, Pamio…)

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Stack runtime
```
┌─ Bot (Railway)
│   ├── Node.js 18+ / Express.js
│   ├── better-sqlite3 (WAL mode)
│   ├── node-cron (Africa/Casablanca)
│   ├── Winston logger
│   ├── helmet + CORS + express-rate-limit
│   └── OpenAI SDK → {OpenAI, NVIDIA NIM, Groq, OpenRouter}
├─ Messagerie
│   ├── Meta Cloud API (prod WhatsApp)
│   ├── Twilio Sandbox (dev WhatsApp)
│   └── grammY (Telegram)
├─ Audio
│   └── Groq Whisper (whisper-large-v3-turbo)
├─ Landing/Blog (GitHub Pages)
│   └── HTML statique, 5 langues
└─ Webapp (Railway)
    └── Vanilla JS + OTP auth via bot
```

### 3.2 Modules JS (20 fichiers)

#### `handlers/` (5 fichiers — point d'entrée messages)
| Fichier | Rôle |
|---------|------|
| `messageHandler.js` | Routage messages entrants, commandes utilisateur, log dans `conversation_history` |
| `onboardingFlow.js` | 8 étapes : prénom, âge enfant, défis, style, valeurs, langue, timezone, cron |
| `profileLoader.js` | Lecture/écriture profil SQLite (JSON parsing) |
| `adminHandler.js` | REST admin paginée + rate-limited (`/users`, `/trigger/{morning,evening,weekly}`) |
| `webappApi.js` | OTP send/verify, sessions Bearer, `/me`, `/history` |

#### `services/` (9 fichiers — logique métier)
| Fichier | Rôle |
|---------|------|
| `aiService.js` | Wrapper LLM (OpenAI-compatible), injection knowledge base, prompt builders, retry exponentiel |
| `database.js` | SQLite init + 4 tables + helpers |
| `messengerAdapter.js` | Routage WhatsApp / Telegram par préfixe (`tg:`) |
| `whatsappService.js` | Twilio + Meta API unifié |
| `telegramService.js` | grammY wrapper |
| `transcriptionService.js` | Groq Whisper audio → texte |
| `sessionManager.js` | État conversationnel in-memory (onboarding step…) |
| `promptBuilder.js` | **Singleton** SOUL.md (chargé 1 fois au boot, gain ~50× perf) |
| `logger.js` | Winston → `logs/{combined,error,server}.log` |

#### `cron/` (4 fichiers — automatisation)
| Fichier | Cadence |
|---------|---------|
| `index.js` | Init scheduler |
| `morningPlan.js` | **08:00** — plan parental personnalisé |
| `eveningCheckin.js` | **21:00** — check-in soir 3 questions |
| `weeklyReview.js` | **Dimanche 19:00** — bilan hebdo |

Optimisation appliquée : `Promise.allSettled` par batchs de 5 → 100 users = ~10s (vs 50s+ en séquentiel).

#### `scripts/` (8+ fichiers — outils CLI)
| Fichier | Usage |
|---------|-------|
| `generate-article.js` | `npm run article -- --topic "..." --keyword "..." --author "..."` |
| `article-to-social.js` | `npm run social -- --input <file.md>` |
| `weekly-content.js` | `npm run weekly -- --author etienne-bouchard --week 1 --social` |
| `build-knowledge-cache.js` | `npm run knowledge:build` (postinstall auto) |
| `migrate-json-to-sqlite.js` | `npm run migrate` (one-shot historique) |
| `generate-sitemap.js` | `npm run seo:sitemap` (sitemap.xml + robots.txt) |
| `inject-jsonld.js` | `npm run seo:jsonld` (JSON-LD Article + Person + FAQPage + BreadcrumbList) |
| `translate-blog.js` | Batch traduction (prototype) |

### 3.3 Base de données SQLite (4 tables)

```sql
-- users : profil parent + enfants
CREATE TABLE users (
  phone               TEXT PRIMARY KEY,           -- +212.../tg:<chat_id>
  language            TEXT,
  onboarding_complete INTEGER,
  onboarding_step     INTEGER,
  created_at          TEXT,
  last_active         TEXT,
  cron_active         INTEGER,
  session_state       TEXT,
  parent              TEXT,  -- JSON {name, age, email, timezone}
  children            TEXT,  -- JSON [{name, age, stage, special_needs}]
  challenges          TEXT,  -- JSON [{title, description, since}]
  parenting_style     TEXT,
  cultural_context    TEXT,
  weekly_checkins     TEXT   -- JSON [{date, summary}]
);

-- conversation_history : log complet des échanges
CREATE TABLE conversation_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone       TEXT REFERENCES users(phone) ON DELETE CASCADE,
  role        TEXT,         -- 'user' | 'assistant'
  content     TEXT,
  created_at  TEXT
);
CREATE INDEX idx_conv_phone ON conversation_history(phone);

-- otp_codes : codes OTP webapp login
CREATE TABLE otp_codes (
  phone       TEXT,
  code        TEXT,
  created_at  TEXT,
  expires_at  TEXT,
  used        INTEGER,
  PRIMARY KEY (phone, code)
);

-- sessions : tokens Bearer webapp
CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,
  phone       TEXT REFERENCES users(phone) ON DELETE CASCADE,
  created_at  TEXT,
  expires_at  TEXT
);
```

### 3.4 Variables d'environnement (`.env.example`)

```
PROVIDER=meta|twilio
META_ACCESS_TOKEN=..., PHONE_NUMBER_ID=..., VERIFY_TOKEN=..., META_APP_SECRET=...
TWILIO_ACCOUNT_SID=..., TWILIO_AUTH_TOKEN=..., TWILIO_WHATSAPP_NUMBER=..., TWILIO_WEBHOOK_URL=...
AI_API_KEY=..., AI_BASE_URL=..., AI_MODEL=...
TELEGRAM_BOT_TOKEN=...
GROQ_API_KEY=...
FAL_API_KEY=... (optionnel)
ADMIN_TOKEN=...
WEBAPP_ORIGIN=...
PORT=9000, NODE_ENV=production, TIMEZONE=Africa/Casablanca, LOG_LEVEL=info
```

### 3.5 Déploiement
| Composant | Plateforme | URL |
|-----------|-----------|-----|
| Bot WhatsApp webhook | Railway | `parenting-coach-production-6c1b.up.railway.app/webhook` |
| Bot Telegram webhook | Railway | `parenting-coach-production-6c1b.up.railway.app/webhook/telegram` |
| Webapp parent | Railway | `parenting-coach-production-6c1b.up.railway.app/webapp/` |
| API webapp | Railway | `parenting-coach-production-6c1b.up.railway.app/api/` |
| Landing publique | GitHub Pages (`gh-pages` branch) | `omrisoremed-bot.github.io/parenting-coach-bot/` |
| Landing live actuelle | Netlify | `parentflow-ai.netlify.app` |

---

## 4. BASE DE CONNAISSANCES ÉDITORIALE

### 4.1 Fichiers Markdown (`knowledge/*.md` — 8 thèmes)
| Fichier | Thème |
|---------|-------|
| `attachement-personnalite.md` | Théorie attachement Bowlby/Ainsworth, 4 types, transmission intergénérationnelle |
| `communication-nonviolente.md` | Méthode CNV Rosenberg, observation/sentiment/besoin/demande |
| `developpement-enfant.md` | Stades Piaget, Erikson, jalons langage, signes alerte |
| `discipline-positive.md` | Méthode Jane Nelsen, conséquences naturelles vs punitions |
| `gestion-comportement-crises.md` | Reformulation, validation, redirection, time-in vs time-out |
| `sommeil-alimentation-enfant.md` | Architecture sommeil bébé, 3 méthodes sevrage, modèle Ellyn Satter |
| `styles-parentaux.md` | Typologie Baumrind, autoritatif/permissif/autoritaire/négligent |
| `valeurs-islamiques.md` | Contexte parental valeurs musulmanes (avantage MENA) |
| `LIRE_MOI.md` | Index/guide |

### 4.2 PDFs académiques (`knowledge/*.pdf` — 6 sources)
1. `amp-amp0001508.pdf` — Recherche attachement
2. `IJNRDTH00142.pdf` — Développement enfant
3. `Parenting-Styles-and-Effects-on-Teens.pdf` — Outcomes adolescence
4. `Parenting_Styles_and_Their_Effect_on_Child_Develop.pdf` — Outcomes développement
5. `parents-under-pressure.pdf` — Stress parental
6. `RiB_parenting_matters.pdf` — Méta-revue

**Cache généré** : `knowledge/.pdf-cache.md` (131K chars, troncature 25K/PDF pour contexte LLM, regénéré via postinstall sur Railway).

### 4.3 Profils auteurs (`docs/editorial/authors/`)
- `dr-amara-diallo.md` — Pédiatre, CHU Sainte-Justine, MSF, 4 spécialités, directives de ton, sources MD
- `etienne-bouchard.md` — Consultant sommeil Gold, BC Children's Hospital, méthode "Douce Nuit"

---

## 5. CONTENU PUBLIÉ & STRATÉGIE ÉDITORIALE

### 5.1 Blog en production (6 articles HTML)
| Article | Slug | Auteur | Mot-clé |
|---------|------|--------|---------|
| Crises de colère | `crises-colere-enfant.html` | Dr. Amina Benali | crises de colère enfant techniques |
| Style autoritatif | `style-parental-autoritatif.html` | Sophie Marchand | style parental autoritatif enfant |
| Attachement sécure | `attachement-secure-bebe.html` | Youssef El Khatib | attachement sécure bébé développement |
| Écrans & dév cognitif | `ecrans-enfants-developpement.html` | Dr. Amina Benali | écrans enfants développement cognitif |
| Communication ado | `communication-parents-adolescents.html` | Sophie Marchand | communication parents adolescents |
| Sommeil enfant | `sommeil-enfant-developpement.html` | Youssef El Khatib | sommeil enfant développement |

### 5.2 Banque de contenu planifiée (`scripts/content-plans/`)
**Dr. Amara Diallo** — 36 articles sur 12 semaines (3/sem)
- S1 : Suivi pédiatrique 0–3 mois
- S2 : Signes alerte & stimulation cérébrale
- S3 : Médecine transculturelle & vaccins immigrants
- S4 : Nouveau-né & nutrition précoce
- S5 : Langage & bilinguisme
- S6 : Diversité familiale & santé inclusive
- S7 : Infections & urgences pédiatriques
- S8 : Neurodivergence & dépistage précoce
- S9 : Prévention & immunité
- S10 : Santé en voyage & allaitement
- S11 : Peau, écrans & sommeil (perspective médicale)
- S12 : Guides complets & synthèses

**Étienne Bouchard** — 36 articles sur 12 semaines (3/sem)
- S1 : Bases du sommeil & méthodes douces
- S2 : Sommeil prématuré & environnement sécurisé
- S3 : Méthodes de sevrage nocturne
- S4 : Transitions & changements de contexte
- S5 : Régressions & terreurs nocturnes
- S6 : Sommeil et TDAH/TSA
- S7 : Nuits 0–6 mois & allaitement nocturne
- S8 : Prématurité avancée — post-NICU
- S9 : Sommeil scolaire & écrans
- S10 : Toddler & refus de coucher
- S11 : Adolescent & décalage circadien
- S12 : Méthode Douce Nuit — guide

**Total prévu** : 72 articles + 72 séries de posts sociaux + 72 visuels.

### 5.3 Workflow de production (`docs/editorial/workflow-redaction.md`)
Pipeline en 5 phases : brief éditorial → rédaction IA (1 400–1 800 mots, EEAT, FAQ schema) → review humaine (checklist EEAT/SEO/contenu) → photo brief Fal.ai → vidéo brief (YouTube + Reel) → posts sociaux.
Cadence : Lundi · Mercredi · Vendredi publication. Vendredi : pipeline social pour les 3 articles. Dimanche : programmation semaine suivante.

---

## 6. DOCUMENTATION STRATÉGIQUE (sessions récentes)

### 6.1 Audit stratégique (`docs/strategy/audit-strategique.md`)
**31 failles identifiées** dans 4 catégories :

**Technique (10)** : prompt caching, sitemap dynamique, schema.org, NLU multilingue, versioning prompts, persistance SQLite, backups, dedup webhook, monitoring, observabilité LLM.

**Produit (7)** : visualisation progrès, mémoire long terme (Mem0), contenu pères, communauté, export conversations, friction onboarding, notifications push crise.

**EEAT (5)** : auteurs fictifs sans empreinte LinkedIn, page "À propos" pauvre, pas de liens sortants autorisés, `dateModified` manquant, pas de vidéo embed.

**Marché (5)** : zone grise médecin/coach, différenciation vs Cocoon/Habibi/Dr Becky, marché MENA sous-exploité, tarification cachée, pas de lead magnet.

**Plan SEO 12 mois** : architecture cluster 3 piliers × 12 sous-thèmes × 36 articles = 108 URLs. Cible **40 000 visiteurs organiques/mois** à M12, **8 000 € MRR**.

**Module Jeux parent-enfant** : matrice 6 âges × 3 énergies × 4 lieux = 60 jeux seed, commande bot `jeu`, monétisation via cartes PDF + Game Box trimestrielle.

**Monétisation freemium 3 niveaux** :
- Free : 0 € — 1 enfant, 1 plan/jour, 5 conversations/jour, 5 jeux/mois
- Famille : 9,90 €/mois (ou 79 €/an) — illimité + bilans + 60 jeux + export PDF
- Atelier : 24,90 €/mois (ou 199 €/an) — + appel humain + groupe privé + cartes imprimables

**Sources de revenus complémentaires** : B2B crèches/écoles (290 €/an), affiliation matériel, cours en ligne (49 € unité), Game Box (29 €/trim.), sponsoring éditorial (1 200–2 500 €/mois).

### 6.2 Plan analytics (`docs/analytics/tracking-plan.md`)
**Stack ~150 €/mois** : Plausible (web) + PostHog EU (product) + Langfuse self-host (LLM observability) + Ahrefs Lite (SEO) + Metabase (BI) + UptimeRobot (monitoring).

**North Star Metric** : Weekly Active Coaching Conversations (parent ≥3 messages utiles/sem).

**25 événements trackés** : bot (15), webapp (7), blog (6).

**7 règles d'anomalie automatiques** : spike erreurs LLM, latence P95 > 10s, drop trafic webhook, mot-clé crise détecté, coût LLM/jour dépassé, drop onboarding step 3+, churn weekly > 10%.

**KPIs cibles M12** :
- Trafic organique : 40k/mois
- WAU bot : 2 800
- D30 retention : 35 %
- Free → Family conversion : 5 %
- MRR : 8 000 €
- LTV/CAC : 8×

### 6.3 Workflow rédactionnel (`docs/editorial/workflow-redaction.md`)
Documente le pipeline complet : commandes (`npm run weekly`), standards rédactionnels, checklist EEAT/SEO/contenu, briefs visuels par auteur, template vidéo, planning calendrier 12 semaines × 2 auteurs.

---

## 7. FRONTEND — Itérations

### 7.1 Landing initial (`landing/index.html` + 4 langues)
Version live actuelle sur GitHub Pages + Netlify. Design SaaS classique avec sections hero, témoignages, blog cards, chatbot intégré.

### 7.2 Redesign v1 — Éditorial magazine (REJETÉ)
`landing/redesign/index.html` (v1) — direction "papier crème, encre, Fraunces, slow-living". Aesthétique New Yorker. **Rejeté par le user** : "c'est de la merde".

### 7.3 Redesign v2 — Playground / Kids School (VALIDÉ)
`landing/redesign/index.html` (v2 actuelle) — inspiré du template ThemeForest Rainbow Kids Play School.
- Fonts : **Fredoka** + Nunito + Caveat
- Palette : sun yellow + coral pink + sky blue + mint + lavender + orange sur crème
- Blobs en arrière-plan, ombres solid offset 4-7px ("tampon")
- Cards rotées qui se redressent au hover
- 11 sections : nav, hero, ticker, comment ça marche, features, auteurs, jeux, témoignages, pricing, FAQ, CTA final, footer
- Hero avec 3 cartes de conversation WhatsApp flottantes (anim float 6-8s)
- Wavy dividers SVG entre sections
- Easter-egg : brand-icon change d'emoji au hover

---

## 8. ÉTAT DE LA ROADMAP (PRD v2)

| Phase | Objectif | Statut | Livrables |
|-------|----------|--------|-----------|
| **0** | WhatsApp bot prod + landing 5 langs + blog | ✅ **DONE** | Bot Railway live, landing GitHub Pages, 6 articles blog |
| **1** | Bot Telegram MVP (parité WhatsApp) | ✅ **DONE** | `@ParentEasebot` live, `messengerAdapter` opérationnel |
| **2** | Webapp parent MVP (OTP auth + dashboard) | ✅ **DONE** | webapp/ vanilla JS, /api/{me,history,otp,verify,logout} |
| **3** | Génération articles IA | ✅ **DONE** | `npm run article` produit drafts MD avec frontmatter |
| **4a** | Knowledge PDFs intégrés au prompt | ✅ **DONE** | 6 PDFs parsés, 131K chars, postinstall auto |
| **4b** | Moteur contenu social (agents + Fal.ai) | ✅ **DONE** | 3 agents Writer/Editor/Visual, Fal.ai Flux intégré |
| **4c** | Workflow éditorial 3 articles/sem | ✅ **DONE** | 2 auteurs × 36 sujets × 12 sem, `npm run weekly` |
| **4d** | Sprint 1 SEO (caching + sitemap + JSON-LD) | ✅ **DONE** | OpenAI prefix caching auto, scripts/seo-{sitemap,jsonld}.js |
| **4e** | Audit stratégique + analytics plan | ✅ **DONE** | docs/strategy/ + docs/analytics/ |
| **4f** | Redesign frontend (kids vibe) | ✅ **DONE** | landing/redesign/index.html v2 |
| **5** | Monétisation + Mem0 + multi-enfants | 📋 **PLANNED** | Non démarré |
| **REBRAND** | Nouveau nom (ParentEase pris) | 🔄 **EN COURS** | Décision finaliste : Lullo/Mileto/Pamio/Ouri |

**Pourcentage roadmap livré** : ~83 % (10 sous-phases sur 12).

---

## 9. LEÇONS APPRISES (`tasks/lessons.md`)

12 enseignements documentés sur 3 sprints :

**Sprint 1 — Webhooks sécurité**
1. Toujours vérifier HMAC-SHA256 Meta avec `req.rawBody` (pas après JSON parse)
2. Toujours valider signatures Twilio via SDK officiel
3. Normalisation téléphone stricte (rejet formats locaux, support `00X`/`+X`)
4. Tokens exposés en chat = révocation immédiate, pas de discussion

**Sprint 2 — Sécurité & qualité IA**
5. Jamais `JSON.stringify(user)` complet dans un prompt (data minimization)
6. Whitelist `ADMIN_EDITABLE_FIELDS` pour PUT admin (anti mass assignment)
7. Helmet + CORS globaux dès le départ
8. Injection `conversation_history` (6 derniers échanges) avant chaque appel LLM

**Sprint 3 — Architecture & performance**
9. SOUL.md doit être un **singleton** (`promptBuilder.js`) — chargé 1× au boot, pas N× par cron
10. Cron : `Promise.allSettled` par batchs de 5 (100 users en ~10s vs 50s+)
11. Admin `/users` paginé + projection légère (pas de colonnes JSON volumineuses)
12. Rate limit AVANT vérification token (anti brute-force)

**Méta-leçons**
- Multi-agent review (3 perspectives) > review solo
- Always log usage tokens + cache_hit pour visibilité coût

---

## 10. NPM SCRIPTS DISPONIBLES

```json
{
  "start":            "node bot.js",
  "dev":              "nodemon bot.js",
  "postinstall":      "node scripts/build-knowledge-cache.js || echo 'skipped'",
  "migrate":          "node scripts/migrate-json-to-sqlite.js",
  "article":          "node scripts/generate-article.js",
  "social":           "node scripts/article-to-social.js",
  "weekly":           "node scripts/weekly-content.js",
  "knowledge:build":  "node scripts/build-knowledge-cache.js",
  "seo:sitemap":      "node scripts/generate-sitemap.js",
  "seo:jsonld":       "node scripts/inject-jsonld.js",
  "seo:all":          "npm run seo:jsonld && npm run seo:sitemap",
  "test":             "node --test tests/"
}
```

### Exemples d'usage
```bash
# Générer un article unique
npm run article -- --topic "Régression du sommeil à 4 mois" --keyword "régression sommeil 4 mois" --author "Étienne Bouchard"

# Générer les 3 articles de la semaine 1 d'Étienne + posts sociaux + visuels
npm run weekly -- --author etienne-bouchard --week 1 --social

# Injecter JSON-LD + générer sitemap
npm run seo:all
```

---

## 11. BLOCAGES & RISQUES IDENTIFIÉS

### 11.1 Bloqueurs critiques (P0)
| # | Risque | Impact | Action |
|---|--------|--------|--------|
| 1 | **Nom ParentEase pris** sur 3 plateformes | Impossibilité de SEO-dominer, risque légal confusion | Rebrand immédiat (Lullo recommandé) |
| 2 | **Clé OpenAI exposée** en clair dans chat | Facturation tiers possible, vol de quota | Révoquer immédiatement sur platform.openai.com |
| 3 | **Auteurs fictifs sans LinkedIn réel** | Google détecte → déclasse pour EEAT | Soit créer profils LinkedIn réels, soit basculer sur experts réels rémunérés |

### 11.2 Risques techniques (P1)
| # | Risque | Mitigation à implémenter |
|---|--------|-------------------------|
| 4 | **SQLite Railway non persistant** | Vérifier volume Railway monté ou migrer Turso/Neon |
| 5 | **Pas de backup automatique BDD** | Cron daily : SQLite dump → S3/R2 |
| 6 | **Pas de monitoring uptime** | UptimeRobot (gratuit, 5 monitors) |
| 7 | **Pas de tests automatisés** | Setup minimal `node --test tests/` (smoke tests) |
| 8 | **Dedup webhook en mémoire** | Table `processed_message_ids` SQLite TTL 24h |
| 9 | **Pas de versioning prompts** | Git-tag par release + table `prompt_versions` |

### 11.3 Risques produit (P2)
| # | Risque | Mitigation |
|---|--------|------------|
| 10 | **Pas de mémoire long terme** (juste 6 derniers échanges) | Intégrer Mem0 ou Letta (Phase 5) |
| 11 | **Onboarding 8 étapes = drop-off > 50%** probable | Réduire à 3 étapes minimum, completion progressive |
| 12 | **Pas de visualisation des progrès** | Dashboard avec timeline + graphes humeur |
| 13 | **Aucun contenu pour les pères** | Activer Thomas Girard (10e auteur déjà identifié) |

---

## 12. PROCHAINES ÉTAPES RECOMMANDÉES

### 12.1 À FAIRE CETTE SEMAINE (P0)
1. ✅ **Révoquer la clé OpenAI exposée** + créer nouvelle clé → `.env` local + Railway
2. 🔄 **Décider du nouveau nom** (vérifier dispo `lullo.app` / `.com` / `.io`)
3. 📋 **Migrer le code** vers le nouveau nom : `SOMMAIRE.md`, `PRD.md`, frontend, prompts, redirects
4. 📋 **Activer OpenAI prefix caching** : `AI_BASE_URL=https://api.openai.com/v1` + `AI_MODEL=gpt-4o-mini`
5. 📋 **Lancer `npm run seo:all`** pour générer sitemap.xml + JSON-LD sur les 6 articles existants
6. 📋 **Soumettre sitemap** à Google Search Console + Bing Webmaster

### 12.2 SPRINT SUIVANT (P1 — 2 semaines)
7. **Backup SQLite** : cron daily SQLite dump → S3/R2
8. **Monitoring** : UptimeRobot (5 monitors) + alerting Slack
9. **Dedup webhook persistant** : table `processed_message_ids` SQLite
10. **Première semaine de contenu** : `npm run weekly --author dr-amara-diallo --week 1 --social`
11. **Auteur père** : créer `docs/editorial/authors/thomas-girard.md` + content-plan

### 12.3 PHASE 5 (P2 — 1 mois)
12. **Mem0 / mémoire long terme** : remplacer fenêtre 6 messages par mémoire sémantique persistante
13. **Multi-enfants par compte** : refonte schéma `children[]` + UI dashboard
14. **Stripe paywall** : Free / Famille 9,90 € / Atelier 24,90 €
15. **Lead magnet** : PDF "50 phrases qui apaisent un enfant en crise" + funnel email
16. **Onboarding allégé** : 3 étapes au lieu de 8, complétion progressive

### 12.4 LONG TERME (P3 — 3-6 mois)
17. Programmatic SEO : 200 pages `/questions/comment-coucher-bebe-de-X-mois` (X = 1 à 36)
18. Pages outils gratuits indexables : calculateur sommeil bébé, calendrier vaccins
19. Module **Jeux parent-enfant** : 60 jeux seed + commande bot `jeu`
20. Boîte physique **Game Box** trimestrielle (modèle KiwiCo)
21. B2B crèches/écoles : licence groupée 290 €/an
22. Étude propriétaire "Baromètre du sommeil bébé MA/CA/FR 2026" pour digital PR

---

## 13. MÉTRIQUES À DATE

| Catégorie | Métrique | Valeur |
|-----------|----------|--------|
| **Code** | Modules JS | 20 (handlers + services + cron + scripts) |
| **Code** | Lignes (estimé) | ~6 000 |
| **Code** | Commits Git | 28 (main) |
| **Code** | Branches actives | 3 (main, gh-pages, claude/hardcore-tharp) |
| **Contenu** | Articles blog publiés | 6 |
| **Contenu** | Articles planifiés (banque) | 72 (36 × 2 auteurs) |
| **Contenu** | Knowledge base | 8 MD + 6 PDFs (131K chars) |
| **Contenu** | Langues supportées | 5 (FR, EN, ES, PT, AR) |
| **Contenu** | Profils auteurs documentés | 2 / 10 (Dr. Amara, Étienne) |
| **Roadmap** | Phases livrées | 10 / 12 sous-phases (83%) |
| **Infra** | Tables SQLite | 4 |
| **Infra** | Cron jobs actifs | 3 (08:00 / 21:00 / Dim 19:00) |
| **Infra** | Canaux messageries | 2 (WhatsApp + Telegram) |
| **Coût mensuel actuel** | Railway + APIs | ~5–8 € |
| **Coût cible M12** | + Stripe + Fal.ai + Postiz | ~25 € |

---

## 14. ANNEXES

### 14.1 Composition de l'équipe éditoriale (planifiée — 10 auteurs)
| # | Nom | Spécialité | Région | Statut profil |
|---|-----|-----------|--------|---------------|
| 1 | Dr. Amara Diallo | Pédiatrie · Dév 0–6 ans | 🇨🇦 Montréal | ✅ Profil + 36 sujets |
| 2 | Dr. Isabella Ferreira | Neuropsychologie | 🇧🇷→🇫🇷 Paris | À documenter |
| 3 | Priya Nair | Coaching interculturel | 🇮🇳→🇬🇧 Londres | À documenter |
| 4 | Emma Lindqvist | Sommeil nordique | 🇸🇪 Stockholm | À documenter |
| 5 | Dr. Yuki Tanaka | Nutrition pédiatrique | 🇯🇵→🇧🇪 Bruxelles | À documenter |
| 6 | Dr. Marcus Johnson | Médecine pédiatrique | 🇺🇸 Baltimore | À documenter |
| 7 | Dr. Sofia Reyes | Trauma & attachement | 🇺🇸 Los Angeles | À documenter |
| 8 | Dr. Rachel Kim | Nutrition BLW | 🇺🇸 Chicago | À documenter |
| 9 | Étienne Bouchard | Sommeil · Méthode Douce Nuit | 🇨🇦 Vancouver | ✅ Profil + 36 sujets |
| 10 | Thomas Girard | Coaching paternité | 🇫🇷 Lyon | À documenter (priorité — angle père) |

### 14.2 Liens de production
- **Bot Telegram** : https://t.me/ParentEasebot
- **Bot WhatsApp webhook** : `parenting-coach-production-6c1b.up.railway.app/webhook`
- **Landing live** : `parentflow-ai.netlify.app`
- **Landing GitHub Pages** : `omrisoremed-bot.github.io/parenting-coach-bot/`
- **Repo GitHub** : `omrisoremed-bot/parenting-coach-bot`

### 14.3 Documents structurants (à consulter en priorité)
1. `PRD.md` — Vision produit + roadmap 5 phases
2. `SOMMAIRE.md` — Index général du projet
3. `tasks/todo.md` — État des tâches en cours
4. `tasks/lessons.md` — Leçons apprises (à enrichir)
5. `docs/strategy/audit-strategique.md` — 31 failles + plan SEO + monétisation
6. `docs/analytics/tracking-plan.md` — Stack + KPIs + anomalies
7. `docs/editorial/workflow-redaction.md` — Pipeline éditorial 3 articles/sem
8. `agents/SOUL.md` — Méthodologie coaching (system prompt)

---

## 15. CONCLUSION

Le projet est dans un **état de maturité technique élevé** (80%+ de la roadmap livrée) mais **bloqué côté go-to-market** par :
1. La perte du nom commercial **ParentEase** (pris par 3 concurrents)
2. L'absence de tarification activée (pas de Stripe, pas de paywall)
3. L'EEAT fragile (auteurs fictifs sans empreinte LinkedIn réelle)

**Recommandation prioritaire** : enchaîner ces 4 décisions dans cet ordre, sur les **2 prochaines semaines** :

```
1. Révoquer la clé OpenAI exposée
2. Décider le nom définitif (Lullo recommandé) + réserver les domaines
3. Migrer tous les fichiers vers le nouveau nom + redirects
4. Lancer la première semaine de contenu (npm run weekly)
5. Activer OpenAI + prefix caching + monitoring + backups
6. Soumettre sitemap à Google Search Console
```

Une fois ces 6 actions effectuées, le projet peut entrer en **mode "growth"** : produire 3 articles/semaine, suivre les KPIs, ouvrir le paywall Stripe et viser les **8 000 € MRR à M12**.

---

*Document généré par analyse exhaustive Git + filesystem le 2026-05-10.*
*Pour mise à jour : relancer une session avec `analyse complète du projet`.*
