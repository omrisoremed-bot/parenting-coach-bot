# ParentEase — Plan Analytics & Intelligence
> Tracking · KPIs · Stack outil · Détection d'anomalies

---

## 1. Stack analytique recommandée

| Couche | Outil | Pourquoi |
|--------|-------|----------|
| Web analytics privacy-first | **Plausible** ou **Umami self-host** | RGPD natif, pas de bandeau cookie, ~20 €/mo |
| Product analytics (bot + webapp) | **PostHog Cloud EU** | Funnel + cohort + session replay, 1M events gratuits |
| SEO tracking | **Ahrefs Lite** (99 €/mo) ou **Serpstat** (~50 €/mo) | Suivi rang + backlinks |
| Search Console | **Google Search Console** + **Bing Webmaster** | Gratuit, obligatoire |
| Logs structurés | **Axiom** ou **Better Stack** | Logs Winston pushés via webhook |
| Uptime + perf | **UptimeRobot** (gratuit) + **Better Stack** | Pannes détectées <2 min |
| LLM observability | **Langfuse self-host** | Trace chaque appel Claude/NIM, coût/req, qualité |
| BI / Dashboard | **Metabase Cloud** (10 €/mo) sur SQLite répliqué | Dashboards pour le founder |

**Coût total stack analytique : ~150 €/mois** — viable dès MRR 1 500 €.

---

## 2. Tracking plan — Événements à logger

### 2.1 Bot WhatsApp/Telegram (PostHog `capture()`)

| Événement | Propriétés clés | Trigger |
|-----------|-----------------|---------|
| `bot_message_received` | channel, has_media, lang, user_id (hashé) | tout webhook entrant |
| `bot_message_sent` | channel, msg_type (plan/check-in/réponse), latency_ms, tokens_in/out, cost_usd | toute réponse |
| `onboarding_started` | channel, lang | 1er message d'un nouveau user |
| `onboarding_step_completed` | step (1-7), elapsed_sec | chaque étape |
| `onboarding_completed` | total_duration_min, drop_steps[] | étape 7 OK |
| `cron_morning_sent` | user_id, success | 08:00 |
| `cron_evening_response` | user_id, mood_score, has_text | parent répond au check-in |
| `weekly_review_completed` | user_id, energy_score | dimanche 19:00 |
| `command_used` | cmd (stop/aide/reset/jeu) | détection mot-clé |
| `game_requested` | age, duration, location, energy | commande "jeu" |
| `crisis_keyword_detected` | keyword, severity | mots: "j'en peux plus", "crise", "frapper" |
| `referral_to_pro` | reason (médical/psy/violence) | bot oriente vers humain |

### 2.2 Webapp parent

| Événement | Propriétés |
|-----------|-----------|
| `webapp_login_otp_requested` | phone_country |
| `webapp_login_success` | session_duration_target |
| `dashboard_viewed` | tab (profil/enfants/historique/bilans) |
| `history_export_clicked` | format (pdf/email) |
| `paywall_shown` | feature_blocked, tier_required |
| `subscribe_clicked` | tier (family/premium), period (month/year) |
| `subscription_completed` | mrr_added_eur |

### 2.3 Blog & SEO

| Événement | Propriétés |
|-----------|-----------|
| `article_viewed` | slug, author_id, read_time_sec, scroll_depth |
| `cta_blog_to_bot_clicked` | slug, position (top/inline/footer) |
| `lead_magnet_downloaded` | magnet_id, email_captured |
| `social_share` | platform (X/IG/LI/Pinterest), slug |
| `internal_link_clicked` | from_slug, to_slug |
| `search_internal` | query, results_count |

---

## 3. KPIs — Tableau de bord exécutif

### 3.1 Dashboard "North Star"

**North Star Metric : Weekly Active Coaching Conversations** (parent qui a échangé ≥3 messages utiles dans la semaine).

### 3.2 KPIs hebdomadaires (revue lundi 9h)

| KPI | Cible M3 | Cible M6 | Cible M12 |
|-----|---------|---------|---------|
| Trafic blog organique / sem | 1 500 | 8 000 | 40 000 |
| Lead magnet → email signups / sem | 50 | 300 | 1 200 |
| New bot users / sem | 30 | 200 | 800 |
| Onboarding completion rate | 50 % | 65 % | 75 % |
| WAU bot (Weekly Active Users) | 80 | 600 | 2 800 |
| D7 retention (% revenus jour 7) | 30 % | 45 % | 55 % |
| D30 retention | 15 % | 25 % | 35 % |
| Free → Family conversion | 1,5 % | 3 % | 5 % |
| MRR | 350 € | 2 100 € | 8 000 € |
| Churn mensuel | 12 % | 7 % | < 5 % |
| Coût LLM / utilisateur actif / mois | 0,40 € | 0,18 € | 0,08 € (cache) |

### 3.3 KPIs SEO (revue mensuelle)

| KPI | M0 | M6 | M12 |
|-----|----|----|----|
| URLs indexées (Google) | 10 | 80 | 200 |
| Mots-clés top 10 | 0 | 35 | 150 |
| Domain Rating Ahrefs | 5 | 18 | 32 |
| Backlinks dofollow | 5 | 60 | 250 |
| Featured snippets capturés | 0 | 8 | 40 |
| CTR moyen GSC | < 1 % | 3 % | 5 % |

### 3.4 KPIs qualité IA

| KPI | Mesure | Cible |
|-----|--------|-------|
| Hallucination rate | % de réponses contenant info inventée (audit manuel 50 réponses/sem) | < 2 % |
| Refus inappropriés | % de réponses où bot refuse alors qu'il aurait dû aider | < 5 % |
| Sentiment réponse | scoring 1-5 par échantillon LLM-judge | ≥ 4,2 |
| Latency P95 réponse | depuis webhook → message envoyé | < 6 sec |
| Coût moyen / réponse | tokens × prix | < 0,015 € |

---

## 4. Détection d'anomalies — règles automatiques

À implémenter dans un script `scripts/anomaly-monitor.js` exécuté toutes les 15 min en cron.

| Anomalie | Seuil | Action |
|----------|-------|--------|
| Spike d'erreurs LLM | > 5 % sur 10 min | Slack alerte + fallback model |
| Latence P95 > 10s | sur 10 min | Slack alerte |
| Drop trafic webhook | < 50 % de la moyenne 7j à même heure | Slack — vérifier Meta/Twilio |
| Mot-clé crise détecté | tout `crisis_keyword_detected` severity=high | Email founder immédiat |
| Coût LLM jour > €X | budget journalier dépassé | Throttle + alerte |
| Onboarding drop step 3+ | > 30 % drop sur cohort 24h | Review messages onboarding |
| Churn weekly > 10 % | sur cohort active | Email survey "raison du départ" |

---

## 5. Cohort analysis — modèle de rétention

À mettre dans Metabase :

```sql
-- Cohorte hebdo : % parents toujours actifs après N semaines
WITH cohorts AS (
  SELECT
    user_id,
    DATE(MIN(created_at), 'weekday 1') AS cohort_week
  FROM users
  GROUP BY user_id
),
activity AS (
  SELECT
    c.cohort_week,
    CAST((julianday(DATE(m.created_at)) - julianday(c.cohort_week)) / 7 AS INTEGER) AS week_offset,
    COUNT(DISTINCT m.user_id) AS active_users
  FROM cohorts c
  JOIN conversation_history m USING (user_id)
  GROUP BY c.cohort_week, week_offset
)
SELECT * FROM activity ORDER BY cohort_week, week_offset;
```

---

## 6. Compétiteurs — Benchmark à automatiser

### 6.1 Veille SEO compétiteurs

Liste à monitorer dans Ahrefs (alertes nouvelles pages) :
- `parents.fr`, `magicmaman.com`, `doctissimo.fr/maman`, `naitreetgrandir.com` (CA), `mpedia.fr`
- Apps directes : `cocoonbabycare.com`, `tinybeans.com`, `huckleberrycare.com`, `napper.app`

### 6.2 Gap analysis (mensuel)

Pour chaque pilier, extraire d'Ahrefs :
1. Mots-clés où compétiteur top 10 et nous absents → backlog éditorial
2. Pages compétiteurs avec >20 backlinks → reverse-engineer (skyscraper technique)
3. Featured snippets compétiteurs → cibler pour les voler

---

## 7. Setup initial (sprint 1)

```bash
# 1. PostHog
npm install posthog-node
# Wrap dans services/analytics.js
# Capture events dans messageHandler.js + webappApi.js

# 2. Plausible
# Ajouter <script defer data-domain="parentflow-ai.netlify.app" src="https://plausible.io/js/script.js"></script>
# Sur tous les .html

# 3. Search Console
# Vérifier propriété, soumettre sitemap

# 4. UptimeRobot
# 5 monitors : /, /webhook, /webhook/telegram, /api/me, /webapp/

# 5. Langfuse
# docker run langfuse/langfuse — sur Railway
# Wrap aiService.js

# 6. Anomaly monitor
# scripts/anomaly-monitor.js + cron toutes les 15 min
```

