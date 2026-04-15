# tasks/todo.md

_Dernière mise à jour : 2026-04-14 (Phases 1–4a livrées)_

## ✅ Phase 1 — Bot Telegram (DONE)

- [x] `services/telegramService.js` (grammY wrapper)
- [x] `services/messengerAdapter.js` (routage par préfixe `tg:`)
- [x] Route `/webhook/telegram` dans `bot.js`
- [x] Swap des 7 call sites `whatsappService` → `messengerAdapter`
- [x] Token Railway + webhook enregistré → `@ParentEasebot` live et testé

## ✅ Phase 2 — Webapp parent MVP v1 (DONE)

**Backend**
- [x] Table `sessions` + `otp_codes` dans `database.js`
- [x] Helper `logMessage()` pour tracer `conversation_history`
- [x] `handlers/webappApi.js` — 5 endpoints : request-otp, verify-otp, logout, /me, /history
- [x] Middleware `requireSession` (Bearer token)
- [x] Wire `/api` + static `/webapp` dans `bot.js`
- [x] `messageHandler.js` log les messages user + assistant

**Frontend vanilla (pas de build step)**
- [x] `webapp/index.html` — 2-step login (phone → code)
- [x] `webapp/dashboard.html` — profil + enfants + défis + bilans + historique
- [x] `webapp/app.js` — router + auth flow + rendering
- [x] `webapp/styles.css` — design tokens ParentEase

**Tests**
- [x] E2E local : seed user → request-otp → verify-otp → /me → /history → /logout

## ✅ Phase 3 — Génération d'articles IA v1 (DONE)

- [x] `scripts/generate-article.js` — CLI avec `--topic --keyword --author --lang --model`
- [x] System prompt éditorial ParentEase (EEAT + SEO + ton + FAQ)
- [x] Sortie markdown dans `landing/blog/drafts/<date>-<slug>.md`
- [x] `npm run article -- --topic "..."` exposé dans `package.json`
- [x] La knowledge base enrichie (MD + PDFs) est injectée dans le system prompt

## ✅ Phase 4a — Knowledge PDFs intégrés (DONE)

- [x] `npm install pdf-parse` (v2 avec classe `PDFParse`)
- [x] `scripts/build-knowledge-cache.js` — parse tous les PDFs, écrit `knowledge/.pdf-cache.md`
- [x] `loadKnowledgeBase()` lit automatiquement le cache à côté des `.md`
- [x] `postinstall` régénère le cache à chaque deploy Railway
- [x] `.gitignore` exclut le cache généré (PDFs sources versionnés)
- [x] 6 PDFs parsés, 131K chars, troncature à 25K/PDF pour préserver le contexte

---

## ✅ Phase 4b — Moteur de contenu social (DONE — 2026-04-15)

- [x] `scripts/article-to-social.js` — pipeline multi-agents : Writer → Editor → Visual Brief
- [x] Agent 1 (Writer) : génère brouillons X (≤280 chars), Instagram (caption+hashtags), LinkedIn (~1000 chars)
- [x] Agent 2 (Editor) : révise et améliore chaque post
- [x] Agent 3 (Visual Brief) : génère un prompt Fal.ai/Flux pour l'image
- [x] Fal.ai Flux Schnell intégré via REST API (axios) — actif si `FAL_API_KEY` défini, sinon ignoré
- [x] Sortie dans `landing/blog/social/<date>-<slug>/` : `x.txt`, `instagram.txt`, `linkedin.txt`, `visual-prompt.txt`, `visual.png`
- [x] `npm run social -- --input <fichier.md>` ajouté dans `package.json`
- [x] `FAL_API_KEY` documenté dans `.env` et `.env.example`

**Usage :**
```bash
npm run article -- --topic "Gérer les crises du coucher" --keyword "crise coucher enfant"
npm run social -- --input landing/blog/drafts/2026-04-15-gerer-les-crises-du-coucher.md
```

**Postiz (publication) :** reporté — intégration self-hosted Railway trop complexe pour ce sprint.

## ✅ Sprint 3 — Architecture + Performance (DONE — 2026-04-15)

- [x] **M3** `services/promptBuilder.js` créé — singleton : SOUL.md (182K chars) chargé **1 fois** au lieu de 4 ; messageHandler + 3 crons en bénéficient via `require` cache Node.js
- [x] **M5** `adminHandler.js` — `GET /admin/users` paginé (`?page=&limit=`, max 100/page), projection légère (sans colonnes JSON volumineuses), tri par `last_active DESC`
- [x] **M6** 3 fichiers cron refactorisés — `Promise.allSettled` par batches de 5 en parallèle ; 100 users = ~10s au lieu de 50s+
- [x] **M7** `adminHandler.js` — `express-rate-limit` : 20 req / 15 min par IP avant auth token (anti brute-force)

## ✅ Sprint 2 — Sécurité + Qualité IA (DONE — 2026-04-15)

- [x] **H3** `adminHandler.js` — Mass assignment corrigé : whitelist `ADMIN_EDITABLE_FIELDS`, retour 400 si aucun champ valide
- [x] **M1** `aiService.js` — `buildEveningPrompt` + `buildWeeklyPrompt` : champs sélectifs uniquement (plus de `JSON.stringify(user)` complet envoyé à NVIDIA NIM)
- [x] **M2** `bot.js` — `helmet()` global + CORS sur `/api` via `WEBAPP_ORIGIN` env var ; `npm install helmet cors`
- [x] **M4** `messageHandler.js` — `handleConversation` relit les 6 derniers échanges de `conversation_history` avant chaque appel IA (la table existait déjà, câblage manquait)
- [x] `.env` / `.env.example` — `WEBAPP_ORIGIN` documenté

> ⚠️ Railway : ajouter `WEBAPP_ORIGIN=https://ton-app.railway.app`

## ✅ Sprint 1 — Sécurité webhooks (DONE — 2026-04-14)

- [x] **H1** `bot.js` — Vérification HMAC-SHA256 Meta (`X-Hub-Signature-256`) via `META_APP_SECRET`
- [x] **H2** `bot.js` — Validation signature Twilio (`twilio.validateRequest()`) via `TWILIO_WEBHOOK_URL`
- [x] **H4** `webappApi.js` — Fix `normalizePhone` : rejet des formats locaux (`0612...` → invalide), support `00XXXX` → `+XXXX`, message d'erreur actionnable
- [x] `.env.example` — Ajout `META_APP_SECRET`, `TWILIO_WEBHOOK_URL`, `GROQ_API_KEY`, `SANDBOX_JOIN_CODE`

> ⚠️ Action manuelle requise : `META_APP_SECRET` et `TWILIO_WEBHOOK_URL` à ajouter dans Railway

## 📋 Backlog (prochaines itérations)

### Phase 1.1 — Durcissement Telegram
- [ ] **Révoquer le token exposé dans le chat** (`/revoke` BotFather → nouveau token → Railway)
- [ ] Commandes Telegram natives `/start` `/help` `/profil` `/stop` `/reset`
- [ ] Support notes vocales Telegram (file_id → Groq Whisper → messageHandler)
- [ ] Secret token (header `X-Telegram-Bot-Api-Secret-Token`) anti-spoofing

### Phase 2.1 — Webapp durcissement
- [ ] Passer à Astro + îlot React pour SSR + perf
- [ ] Ajouter `/api/history` streaming avec pagination
- [ ] Vue "Bilans hebdomadaires" avec mini-graph
- [ ] Mode sombre

### Phase 3.1 — Pipeline article complet
- [ ] Script `scripts/draft-to-html.js` : markdown → template `landing/blog/*.html`
- [ ] Review SEO auto (density, H2, FAQ schema)
- [ ] Decap CMS si on veut l'édition depuis le dashboard

### Phase 4b — Moteur de contenu social
- [ ] Agents writer + editor + visual (Claude Agent SDK)
- [ ] `scripts/article-to-social.js` : 1 article → 3 posts (X, IG, LI)
- [ ] Génération visuels via Fal.ai (Flux)
- [ ] Publication via Postiz (self-hosted Railway)

### Phase 5 — Monétisation + scale
- [ ] Mem0 pour mémoire long terme
- [ ] Multi-enfants par parent
- [ ] Freemium : gratuit = 1 enfant + 1 plan/jour, pro = illimité
