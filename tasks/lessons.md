# tasks/lessons.md

_Format : `[date] | ce qui a mal tourné | règle pour éviter`_

## 2026-04-15 (Sprint 3 — Architecture + Performance)

- **SOUL.md relu N fois = N fois le I/O disque au démarrage** | Créer un singleton `services/promptBuilder.js` dès qu'un string coûteux est partagé par plusieurs modules. Node.js met les modules en cache — un seul `require` suffit pour tous les consommateurs.
- **Cron séquentiel + sleep = bombe à retardement à l'échelle** | Remplacer `for...of` + `sleep(500)` par `Promise.allSettled` avec batches de taille fixe. Les erreurs individuelles sont isolées, le batch continue.
- **`SELECT *` sans LIMIT sur une table admin = réponse potentiellement de plusieurs MB** | Toujours paginer les endpoints qui listent des entités, et projeter uniquement les colonnes nécessaires. Garder le profil complet pour `GET /resource/:id`.
- **Rate limit doit précéder l'auth, pas la suivre** | Mettre `rateLimit` avant `adminAuth` pour épuiser le quota d'un attaquant avant même de valider son token.

## 2026-04-15 (Sprint 2 — Security + AI quality)

- **`JSON.stringify(user)` complet dans un prompt = fuite de données vers provider externe** | Ne jamais sérialiser l'objet profil entier dans un prompt IA. Construire un objet `safe` avec uniquement les champs nécessaires au modèle. `buildMorningPrompt` était correct ; `buildEveningPrompt` et `buildWeeklyPrompt` ne l'étaient pas.
- **`conversation_history` existait en DB mais n'était pas injectée dans callAI** | Vérifier systématiquement que les tables créées sont réellement utilisées dans le flux principal. La table était écrite (`logMessage`) mais jamais relue pour alimenter le contexte IA des conversations libres.
- **Mass assignment via `{ ...existing, ...req.body }` sans whitelist = risque critique** | Toujours définir une liste explicite de champs modifiables pour les endpoints PATCH/PUT. Tout ce qui n'est pas dans la whitelist est ignoré silencieusement.
- **helmet() et cors() oubliés = headers de sécurité manquants** | Ajouter `helmet()` en tout premier middleware Express, et configurer CORS explicitement avec une origin restreinte dès la Phase 1.

## 2026-04-14 (Sprint 1 — Security fixes)

- **Webhooks sans vérification de signature = porte ouverte** | Toujours vérifier `X-Hub-Signature-256` (Meta) et `X-Twilio-Signature` (Twilio) avant de traiter un webhook. Sans ça, n'importe qui peut forger des messages. Capturer `rawBody` via `express.json({ verify })` pour le HMAC Meta.
- **`express.json()` parse le body avant le HMAC** | Pour vérifier une signature HMAC sur le body brut, il faut capturer `req.rawBody` dans le callback `verify` de `express.json()` — après parsing, `JSON.stringify(req.body)` peut diverger du payload original (ordre des clés, Unicode escaping).
- **`normalizePhone` + `+` automatique = faux E.164** | Ne jamais ajouter `+` devant un numéro local (ex: `0612...` marocain → `+0612...` invalide). Exiger le format E.164 explicite ou supporter `00XXX` → `+XXX` uniquement.
- **Multi-agent review détecte ce que le dev seul manque** | 3 agents indépendants (Security/Correctness/Architecture) ont trouvé 8 HIGH/CRITICAL en 5 min. Lancer le tribunal avant chaque PR non triviale.

## 2026-04-14

- **`git merge` cross-branch échoue sur "unrelated histories"** | Plutôt que `merge`, copier les fichiers entre branches avec `git show <branch>:<path> > <path>` puis commit sur la branche cible. S'applique quand `gh-pages` et `main` n'ont pas d'ancêtre commun.
- **Python `print()` crash `UnicodeEncodeError` sur Windows (cp1256)** | Sur Windows, ne pas `print()` de strings contenant des accents/arabe sans setter `PYTHONIOENCODING=utf-8`. Pour tester la présence de texte, utiliser `in` plutôt que print.
- **Railway auto-deploy prend 30-90s après un push main** | Après un push qui ajoute une route, poller `/health` ou la nouvelle route en boucle courte (sleep 10s) au lieu de supposer que c'est déjà en ligne.
- **Token Telegram posté en clair dans le chat** | Si un utilisateur partage un secret dans la conversation, flagger immédiatement, procéder, puis rappeler la révocation à la fin. Ne pas juste taire le problème.
- **`sendMessage` utilisé partout dans le backend → un swap = 7 fichiers** | Avant d'ajouter un 2e canal, wrapper d'abord dans un adapter. La prochaine fois, créer l'adapter AVANT la 2e intégration, pas pendant.
