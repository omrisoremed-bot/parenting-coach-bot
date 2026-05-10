# Procédure de rotation des clés API — ParentAtEase

> Zero-downtime key rotation. Réf. CHANTIER B (mission rebrand 2026-05-10).

---

## 🎯 Principe

**On ne révoque jamais une clé sans avoir confirmé que la nouvelle marche en prod.**
Procédure en 5 étapes :

```
[1] Générer NEW key  →  [2] Déployer NEW sur Railway  →  [3] Tester E2E
                                                              ↓ OK
[4] Désactiver OLD ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
                  ↓ NOT OK
                  [4a] Rollback vers OLD, debug, retry
```

---

## 🔑 Rotation OpenAI

### Étape 1 — Générer la nouvelle clé
1. Aller sur https://platform.openai.com/api-keys
2. **Create new secret key** → type **Project key**
3. Nom : `parentatease-prod-YYYY-MM` (ex. `parentatease-prod-2026-05`)
4. **Permissions** : *Restricted* → Models: **Read** · Model capabilities: **Write**
5. Scope : limiter au projet `parentatease` (créer le projet si absent)
6. Copier la clé (commence par `sk-proj-`) → **conserver dans un password manager**, jamais dans un chat ni dans le code
7. ⚠️ **NE PAS ENCORE désactiver l'ancienne clé**

### Étape 2 — Déployer sur Railway
**Option A — Dashboard web (recommandé en l'absence de Railway CLI)** :
1. https://railway.app/project/parenting-coach → Variables
2. Modifier `AI_API_KEY` → nouvelle valeur
3. *Deploy* (auto-trigger sur changement de var)
4. Attendre la fin du déploiement (~1-2 min, status "Active")

**Option B — Railway CLI** (si installé) :
```bash
railway variables set AI_API_KEY="sk-proj-NEW_KEY"
railway up --detach
```

### Étape 3 — Tests E2E
Attendre ~30s après deploy puis :
```bash
# 3a. Health check (existera après chantier E)
curl -s https://parenting-coach-production-6c1b.up.railway.app/health

# 3b. Test bot WhatsApp/Telegram
#   - Envoyer "ping" au bot
#   - Le bot doit répondre en <10s avec une réponse cohérente
#   - Vérifier les logs Railway : aucune erreur 401/403 OpenAI
```

### Étape 4 — Désactiver l'ancienne clé
Si étape 3 OK pendant **24h consécutives** sans erreur :
1. Retour sur https://platform.openai.com/api-keys
2. Trouver l'ancienne clé (préfixe noté avant rotation)
3. **Disable** (ne pas Delete — on garde l'historique d'audit)

### Étape 4a — Rollback (si échec en étape 3)
1. Railway → Variables → restaurer `AI_API_KEY` à l'ancienne valeur
2. Re-deploy
3. Investiguer la cause (clé scope trop restrictif ? modèle indisponible ?)

---

## 🔒 Hard limits OpenAI (à configurer une fois)

https://platform.openai.com/account/limits
- **Hard limit mensuel** : 50 USD (le service s'arrête au plafond — évite la facture surprise)
- **Soft limit alerte email** : 30 USD
- Activer email notifications

---

## 🕵️ Monitoring de fuite quotidien

Script : `scripts/check-key-leaks.js` — cherche les préfixes de toutes nos clés sur le code public GitHub via la Search API.

### Prérequis
1. Générer un GitHub PAT (classic) :
   - https://github.com/settings/tokens
   - Scope **public_repo** (lecture)
   - Expiration : 1 an
2. Stocker dans Railway : `GITHUB_PAT=ghp_...`

### Exécution
```bash
# Local (lit le .env)
npm run security:check-leaks

# Railway cron (à ajouter dans cron/index.js après chantier B)
# 0 4 * * *  →  04h00 Casablanca chaque jour
```

### Sortie attendue
```
🔍 AI_API_KEY (OpenAI / compatible LLM key)... ✅ clean
🔍 TELEGRAM_BOT_TOKEN (Telegram bot token)... ✅ clean
🔍 META_ACCESS_TOKEN (Meta WhatsApp Cloud API token)... ⏭️  not set, skipping
🔍 TWILIO_AUTH_TOKEN (Twilio auth token)... ✅ clean
🔍 GROQ_API_KEY (Groq Whisper API key)... ⏭️  not set, skipping
🔍 FAL_API_KEY (Fal.ai Flux generation key)... ⏭️  not set, skipping

✅ No leaks detected across all watched secrets.
```

En cas de fuite (exit code 2), le script affiche l'URL GitHub du leak → rotation immédiate.

---

## 🚨 Si une clé est leakée en clair (chat / commit / screenshot)

1. **Immédiatement** : désactiver la clé sur la console du provider
2. Générer une nouvelle clé (Étape 1)
3. Procédure de rotation normale (Étapes 2-3-4)
4. `git log -p -- <fichier_leaké>` pour vérifier qu'aucune valeur sensible ne reste dans l'historique git
5. Si la clé a été commitée sur un remote public : **purger l'historique git** (`git filter-repo` ou `bfg-repo-cleaner`) puis force-push (avec confirmation utilisateur)

---

## 📋 Checklist post-rotation

- [ ] Nouvelle clé déployée sur Railway
- [ ] Health check OK
- [ ] Bot WhatsApp répond en <10s
- [ ] Bot Telegram répond en <10s
- [ ] Aucune erreur 401/403 dans les logs Railway sur 1h
- [ ] (24h plus tard) Ancienne clé désactivée
- [ ] `npm run security:check-leaks` planifié en cron
- [ ] Hard limit OpenAI configuré (50 USD/mois)
