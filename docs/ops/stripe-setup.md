# Stripe — Setup procedure

> Réf. CHANTIER B1 (sprint 4 · monétisation).
> **Modèle** : 2 tiers payants, pas de free permanent, essai gratuit 7 jours.

---

## 🎯 Architecture commerciale

| Tier | Mensuel | Annuel (-33%) |
|------|---------|---------------|
| **Famille** | 9,90 €/mois | 79 €/an |
| **Atelier** | 24,90 €/mois | 199 €/an |

- **Essai gratuit** : 7 jours sur tous les plans (Stripe `trial_period_days=7`)
- **Annulable** : 1 clic via le portail Stripe (lien fourni dans le bot)
- **TVA** : facturation Stripe Tax (auto-collect EU)

---

## ✅ Setup côté Stripe Dashboard

### Étape 1 — Créer le compte
1. https://dashboard.stripe.com/register
2. Mode test d'abord (toggle haut-droit) puis live après validation
3. Activer **Stripe Tax** dans `Tax → Settings` (auto-collecte TVA EU)

### Étape 2 — Créer 1 produit, 2 prix par tier

#### Produit 1 — « ParentAtEase Famille »
- Stripe Dashboard → **Products** → **+ Add product**
- Nom : `ParentAtEase Famille`
- Description : « Coach parental IA · enfants illimités · plans &amp; conversations sans limite · 60 jeux · bilans · export PDF mensuel »
- Tax behavior : `Tax inclusive` ou `exclusive` selon ton modèle
- Pricing :
  - Recurring · **9,90 EUR · monthly** → noter le `price_id` (commence par `price_...`)
  - Recurring · **79,00 EUR · yearly** → noter le `price_id`

#### Produit 2 — « ParentAtEase Atelier »
- Idem avec :
  - Nom : `ParentAtEase Atelier`
  - Description : « Tout Famille + appel humain mensuel 30 min + groupe WhatsApp privé par âge + cartes jeux imprimables + bilan mensuel personnalisé »
  - Pricing :
    - **24,90 EUR · monthly**
    - **199,00 EUR · yearly**

### Étape 3 — Customer Portal (anti-friction churn)
- **Settings → Billing → Customer Portal**
- Activer **Subscriptions** :
  - Cancel subscription : ✅ (sinon mauvaise expérience)
  - Switch plans : ✅
  - Update payment method : ✅
- Save

### Étape 4 — Webhook
- **Developers → Webhooks → + Add endpoint**
- Endpoint URL : `https://parenting-coach-production-6c1b.up.railway.app/api/billing/webhook`
- Events à écouter :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
- Récupérer le **Signing secret** (commence par `whsec_...`)

### Étape 5 — Récupérer la clé secrète API
- **Developers → API keys**
- Copier la **Secret key** (commence par `sk_test_...` en test, `sk_live_...` en prod)

### Étape 6 — Configurer Railway
Service `bot` → Variables :
```
STRIPE_SECRET_KEY=sk_test_...   # puis sk_live_... après go-live
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FAMILY_MONTHLY=price_...
STRIPE_PRICE_FAMILY_YEARLY=price_...
STRIPE_PRICE_ATELIER_MONTHLY=price_...
STRIPE_PRICE_ATELIER_YEARLY=price_...
STRIPE_TRIAL_DAYS=7
STRIPE_SUCCESS_URL=https://parentatease.com/webapp/?subscribed=1
STRIPE_CANCEL_URL=https://parentatease.com/?canceled=1
```

Redeploy. Vérifier au boot :
```
[info] Stripe service initialized {"trialDays":7}
[info] Billing routes mounted at /api/billing
```

### Étape 7 — Test de bout en bout (mode test)
1. Aller sur `https://parentatease.com/?test=stripe`
2. Cliquer « S'abonner » sur Famille mensuel
3. Sur la page Stripe Checkout : utiliser carte test `4242 4242 4242 4242` · date `12/34` · CVC `123`
4. Vérifier dans les logs Railway :
   ```
   [info] Stripe webhook received {"type":"checkout.session.completed"}
   [info] Subscription activated {"phone":"+212...","tier":"family","trialEndsAt":"..."}
   ```
5. Envoyer un message au bot → doit passer le paywall ✅
6. Tester l'annulation : `/api/billing/portal` → lien Stripe → annuler → vérifier `status=canceled` en DB

### Étape 8 — Go live
- Stripe Dashboard → toggle **Test → Live** (haut-droit)
- Refaire les Étapes 2-4 en mode Live (les prix de test ne marchent pas en live)
- Mettre à jour les 6 `STRIPE_*` env vars sur Railway avec les valeurs live
- Désactiver les anciennes clés test sur Stripe Dashboard

---

## 🧪 Cartes de test (mode test uniquement)

| Numéro | Comportement |
|--------|--------------|
| `4242 4242 4242 4242` | Succès |
| `4000 0025 0000 3155` | Requires authentication (3DS) |
| `4000 0000 0000 9995` | Decline `insufficient_funds` |
| `4000 0000 0000 0341` | Token réussit puis charge échoue |

Tous : date future quelconque, CVC `123`.

---

## 📊 Métriques à monitorer (PostHog ou Stripe Dashboard)

| Métrique | Cible M3 | Cible M6 |
|----------|---------|---------|
| Trial-to-paid conversion | 25 % | 35 % |
| Churn mensuel (Famille) | < 8 % | < 5 % |
| Churn mensuel (Atelier) | < 4 % | < 3 % |
| LTV moyenne (Famille) | 80 € | 120 € |
| LTV moyenne (Atelier) | 250 € | 400 € |
| Failed payment recovery | 40 % | 60 % |

---

## 🚨 Procédure si problème de paiement

### Le webhook ne répond pas
1. Vérifier le `STRIPE_WEBHOOK_SECRET` sur Railway
2. Inspecter Stripe Dashboard → Developers → Webhooks → ton endpoint → onglet **Events** → voir le détail du dernier echec
3. Re-tenter manuellement depuis ce panel (bouton « Resend »)

### Subscription bloquée en `past_due`
- Stripe relance automatiquement la carte 4 fois sur 7 jours
- Si échec final → `customer.subscription.deleted` → l'utilisateur perd l'accès
- Smart Retries activé par défaut dans Stripe — vérifier que c'est ON

### Utilisateur veut un remboursement
- Stripe Dashboard → Customers → trouver son email → onglet Payments → refund partial ou full
- Pas de procédure auto pour ça (volontaire — ça reste humain)
