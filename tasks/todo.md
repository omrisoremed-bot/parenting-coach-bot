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
