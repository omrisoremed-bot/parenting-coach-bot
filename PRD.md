# PRD — Parenting Coach IA (WhatsApp Bot)
> Version 1.0 — 2026-04-10

---

## 1. Vue d'ensemble

**Parenting Coach** est un bot WhatsApp propulsé par IA qui accompagne les parents au quotidien : conseils personnalisés, plans matinaux, check-ins soir, bilan hebdomadaire, et réponses contextuelles à leurs questions. Le bot gère des profils multi-utilisateurs, respecte la langue et la religion de chaque famille, et peut transcrire des messages vocaux.

**Objectif produit :** Devenir le coach parental IA le plus accessible du marché francophone/arabophone — disponible sur WhatsApp (canal déjà utilisé), sans app à installer, 24h/24.

---

## 2. Contexte — Outils et alternatives existants

### 2.1 Frameworks de bot WhatsApp

| Outil | Type | Forces | Limites |
|-------|------|---------|---------|
| **Twilio API** *(actuel)* | API officielle | Sandbox gratuit, stable | Payant en prod |
| **Baileys** | Lib JS non-officielle | Gratuit, WebSocket direct | Risque ban WhatsApp |
| **@green-api/whatsapp-bot** | NPM + API officielle | Syntaxe Telegraf, sessions | Moins documenté |
| **Botpress** | Plateforme complète | Visual builder, connecteur WhatsApp inclus | Surcharge pour notre usage |
| **Meta Cloud API** *(déjà intégré)* | API officielle Meta | Gratuit, permanent | Validation Meta Business requise |

**Décision v1 :** Rester sur Twilio Sandbox (dev) + Meta Cloud API (prod). Simple, stable, déjà en place.

---

### 2.2 Modèles IA / LLM

| Outil | Modèle | Coût | Forces |
|-------|--------|------|--------|
| **NVIDIA NIM** *(actuel)* | Mistral Large 2 | Gratuit (quota) | Multilingue, rapide |
| **Anthropic Claude** | Sonnet 4.6 | ~$3/M tokens | Meilleur raisonnement, contexte long |
| **Groq LPU** | Llama 3.3 70B | Gratuit (quota) | Ultra-rapide (<1s) |
| **OpenAI** | GPT-4o | ~$5/M tokens | Référence du marché |

**Décision v1 :** Garder NVIDIA NIM (gratuit). Migrer vers Claude Sonnet 4.6 en v2 si le quota est dépassé.

---

### 2.3 Transcription audio

| Outil | Langue | Latence | Coût |
|-------|--------|---------|------|
| **Groq Whisper** *(actuel)* | 99 langues | ~500ms | Gratuit (quota) |
| **OpenAI Whisper local** | 99 langues | 1–3s | Gratuit (auto-hébergé) |
| **Deepgram Nova-3** | 36 langues | ~300ms | Payant |
| **AssemblyAI** | 99 langues | ~800ms | Payant |

**Décision v1 :** Garder Groq Whisper. Passer à Whisper local (Hugging Face) si le quota est limité.

---

### 2.4 Mémoire & profils utilisateurs

| Outil | Type | Forces | Limites |
|-------|------|---------|---------|
| **JSON fichiers** *(actuel)* | Fichiers locaux | Simple, lisible | Non-persistant si Railway restart |
| **Mem0** | Mémoire sémantique IA | Retient préférences, contexte long terme | Dépendance externe |
| **Zep** | Graphe temporel | Trace évolution du contexte | Complexe à setup |
| **SQLite** | DB relationnelle légère | Persistant, pas de service externe | Requêtes SQL |
| **Redis** | Cache mémoire | Ultra-rapide, sessions TTL | Service supplémentaire |

**Décision v1 :** Migrer de JSON vers **SQLite** (persistant, zéro service externe, même Railway). Mem0 en v3.

---

### 2.5 Scheduling (messages automatiques)

| Outil | Type | Forces | Limites |
|-------|------|---------|---------|
| **node-cron** *(actuel)* | In-process | Simple, aucune dépendance | Perdu si crash |
| **BullMQ** | Queue Redis | Persistant, dashboard, retry | Nécessite Redis |
| **Agenda** | MongoDB-backed | Persistant, API simple | Nécessite MongoDB |
| **node-cron + SQLite** | Hybride | Simple upgrade du stack actuel | Pas de retry avancé |

**Décision v1 :** Garder node-cron. En v2, ajouter **BullMQ + Redis** (Railway propose Redis natif) pour la persistance.

---

### 2.6 Base de connaissances

| Outil | Approche | Forces | Limites |
|-------|----------|---------|---------|
| **Fichiers .md** *(actuel)* | Injection directe dans prompt | Simple, 0 config | Limité par taille contexte |
| **LlamaIndex** | RAG + vectorisation | Scalable, recherche sémantique | Python, overhead |
| **LangChain** | RAG JS/Python | Flexible, Mistral natif | Complexité |
| **Chroma** | Vector DB local | Léger, NPM/Python | Setup embeddings |

**Décision v1 :** Garder les fichiers `.md`. En v3, implémenter RAG avec LlamaIndex (quand la base dépasse ~20 fichiers).

---

## 3. Fonctionnalités — Roadmap par étapes

### ÉTAPE 1 — Base stable (MVP actuel + corrections) ✅ En cours

**Objectif :** Bot stable, fiable, déployé 24/7.

| # | Fonctionnalité | Statut |
|---|---------------|--------|
| 1.1 | Onboarding multilingue (FR/AR/Darija/EN) | ✅ Fait |
| 1.2 | Profils utilisateurs JSON | ✅ Fait |
| 1.3 | Coaching libre (Q&A) avec reformulation | ✅ Fait |
| 1.4 | Messages cron : matin / soir / hebdo | ✅ Fait |
| 1.5 | Transcription audio Groq Whisper | ✅ Fait |
| 1.6 | Base de connaissances `.md` | ✅ Fait |
| 1.7 | Déploiement Railway 24/7 | ✅ Fait |
| 1.8 | Commandes utilisateur (AIDE, PAUSE, PROFIL, RESET) | ✅ Fait |
| 1.9 | Réponses religion/culture-aware | ✅ Fait |

**Améliorations immédiates :**
- [ ] **1.10** Migrer stockage JSON → SQLite (persistance Railway restarts)
- [ ] **1.11** Gestion d'erreurs robuste + retry sur appels IA
- [ ] **1.12** Commande `PROFIL` pour afficher/modifier son profil
- [ ] **1.13** Limiter longueur réponses à 300 mots (WhatsApp readability)

---

### ÉTAPE 2 — Expérience enrichie

**Objectif :** Rendre le bot plus utile et engageant au quotidien.

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| 2.1 | **Mémoire contextuelle** | Le bot se souvient des 10 derniers échanges par utilisateur (rolling window) |
| 2.2 | **Suivi des objectifs** | L'utilisateur peut définir 1-3 objectifs parentaux, le bot y fait référence |
| 2.3 | **Suggestions proactives** | Le bot propose un défi parental hebdomadaire basé sur le profil |
| 2.4 | **Commande ASTUCE** | Envoie une astuce parenting aléatoire de la base de connaissances |
| 2.5 | **Accusé de réception intelligent** | Répond en <3s avec "Je réfléchis..." si traitement long |
| 2.6 | **Scheduling persistant** | BullMQ + Redis pour les crons (no message loss on restart) |
| 2.7 | **Panel admin web minimal** | Page `/admin` protégée par token : liste users, stats envois |

---

### ÉTAPE 3 — Personnalisation avancée

**Objectif :** Le bot devient un vrai coach personnalisé sur la durée.

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| 3.1 | **Profil enfant étendu** | Âge, personnalité, défis spécifiques (TDAH, timidité, etc.) |
| 3.2 | **Plans hebdomadaires générés** | Le bot génère un plan 7 jours adapté à l'enfant |
| 3.3 | **Base de connaissances RAG** | LlamaIndex : recherche sémantique dans 50+ articles/PDF |
| 3.4 | **Mémoire long terme** | Mem0 : le bot retient les habitudes, succès et difficultés |
| 3.5 | **Multi-enfants** | Support jusqu'à 3 enfants par profil parent |
| 3.6 | **Rappels ponctuels** | "Rappelle-moi demain à 18h de parler à mon fils de..." |
| 3.7 | **Contenu multimédia** | Envoi de courts articles, images, infographies (Meta API) |

---

### ÉTAPE 4 — Scalabilité & monétisation

**Objectif :** Passer de prototype à produit commercialisable.

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| 4.1 | **Onboarding WhatsApp officiel** | Numéro WhatsApp Business dédié (Meta BSP) |
| 4.2 | **Abonnement** | Freemium : 5 messages/jour gratuit, illimité payant |
| 4.3 | **Dashboard parent** | Web app légère : historique, objectifs, progression |
| 4.4 | **Analytics** | Amplitude/PostHog : taux engagement, messages/jour, rétention |
| 4.5 | **Multi-langues étendu** | Espagnol, Turc, Soninké (diasporas cibles) |
| 4.6 | **API partenaires** | Écoles, mutuelles, associations parentales |

---

## 4. Architecture technique cible (v2)

```
WhatsApp (Meta/Twilio)
        │
        ▼
  Express.js bot.js
        │
   ┌────┴──────────────────────┐
   │                           │
messageHandler.js         onboardingFlow.js
   │                           │
   ▼                           ▼
aiService.js              SQLite (profils)
(NVIDIA NIM / Claude)          │
   │                      BullMQ (Redis)
   ▼                       cron jobs
transcriptionService.js
(Groq Whisper)
   │
knowledge/*.md  ──► (v3) LlamaIndex RAG
```

---

## 5. Stack technique recommandée par étape

| Composant | v1 (actuel) | v2 | v3 |
|-----------|-------------|-----|-----|
| Bot framework | Express.js | Express.js | Express.js |
| Messagerie | Twilio / Meta | Meta Cloud API | Meta WhatsApp Business |
| LLM | NVIDIA NIM (Mistral) | Claude Sonnet 4.6 | Claude + fine-tuning |
| Transcription audio | Groq Whisper | Groq Whisper | Deepgram (temps réel) |
| Stockage profils | JSON | SQLite | PostgreSQL |
| Scheduling | node-cron | BullMQ + Redis | BullMQ + Redis |
| Connaissances | Fichiers `.md` | Fichiers `.md` + résumé IA | LlamaIndex RAG |
| Mémoire | Session JSON | Rolling window 10 msgs | Mem0 |
| Déploiement | Railway | Railway | Railway + CDN |
| Monitoring | Winston logs | Winston + Sentry | Sentry + Amplitude |

---

## 6. Projets open-source de référence

| Projet | GitHub | Pertinence |
|--------|--------|------------|
| **Baileys** | `WhiskeySockets/Baileys` | Alternative à Twilio (WhatsApp direct) |
| **Botpress** | `botpress/botpress` | Inspiration architecture multi-canal |
| **Mem0** | `mem0ai/mem0` | Mémoire long terme pour agents IA |
| **LlamaIndex** | `run-llama/llama_index` | RAG pour la base de connaissances |
| **BullMQ** | `taskforcesh/bullmq` | Scheduling persistant |
| **Chroma** | `chroma-core/chroma` | Vector DB léger pour v3 |
| **self-improvement-4all** | `tripathiarpan20/self-improvement-4all` | Pattern coaching IA (Plan-Act-Reflect) |

---

## 7. Métriques de succès

| Métrique | Cible v1 | Cible v2 |
|---------|----------|----------|
| Uptime | > 99% | > 99.9% |
| Temps de réponse | < 5s | < 3s |
| Taux d'onboarding complet | > 70% | > 85% |
| Rétention 7 jours | — | > 40% |
| Messages/utilisateur/jour | 2–4 | 4–8 |

---

## 8. Prochaines actions immédiates (Étape 1 — à compléter)

1. **Ajouter `GROQ_API_KEY`** dans Railway (transcription audio)
2. **Migrer JSON → SQLite** (priorité : persistance Railway)
3. **Tester onboarding complet** en 4 langues sur WhatsApp
4. **Commande PROFIL** : permettre à l'utilisateur de voir/modifier ses infos
5. **Limiter les réponses** à 300 mots max (prompt engineering)

---

*PRD généré le 2026-04-10 — à réviser à chaque étape complétée.*
