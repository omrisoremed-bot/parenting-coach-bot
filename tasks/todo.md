# tasks/todo.md

_Dernière mise à jour : 2026-04-14_

## ✅ Phase 1 — Bot Telegram (DONE)

- [x] `services/telegramService.js` (grammY wrapper)
- [x] `services/messengerAdapter.js` (routage par préfixe `tg:`)
- [x] Route `/webhook/telegram` dans `bot.js`
- [x] Swap des 7 call sites `whatsappService` → `messengerAdapter`
- [x] Token Railway + webhook enregistré → `@ParentEasebot` live

---

## 🔄 Phase 2 — Webapp parent (EN COURS)

**Objectif v1 :** dashboard read-only avec login OTP envoyé via le bot.

### Backend
- [ ] Table `sessions (token, phone, created_at, expires_at)` dans `database.js`
- [ ] Table `otp_codes (phone, code, created_at, expires_at, used)`
- [ ] `handlers/webappApi.js` :
  - POST `/api/auth/request-otp` — génère code 6 chiffres, envoie via `messengerAdapter`
  - POST `/api/auth/verify-otp` — vérifie code, crée session (7 jours)
  - GET `/api/me` — profil utilisateur (auth requise)
  - GET `/api/history` — 20 derniers messages (auth requise)
  - POST `/api/auth/logout`
- [ ] Middleware `requireSession` (cookie signé ou header `Authorization: Bearer`)
- [ ] Wire dans `bot.js`

### Frontend (vanilla HTML/JS v1, Astro v2)
- [ ] `webapp/index.html` — formulaire login (téléphone → OTP)
- [ ] `webapp/dashboard.html` — profil + historique + challenges
- [ ] Serve statique via Express `/webapp`

### Tests
- [ ] Test manuel end-to-end : demande OTP → reçois sur Telegram → login → dashboard

---

## 📋 Phase 3 — Blog CMS + génération IA (v1)

- [ ] `scripts/generate-article.js` : génère un article markdown à partir d'un sujet + la knowledge base
- [ ] Intégration Claude API avec prompt caching
- [ ] Template article SEO (front-matter + sections fixes)
- [ ] Sauvegarde dans `landing/blog/drafts/` pour review manuelle

---

## 📋 Phase 4 — Intégration PDFs knowledge

- [ ] Parser PDF → texte via `pdf-parse`
- [ ] Auto-load dans `loadKnowledgeBase()` les fichiers `knowledge/*.pdf`
- [ ] Vérifier que le contenu est bien injecté dans le system prompt
