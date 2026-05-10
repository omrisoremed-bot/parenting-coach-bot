# SQLite backup & restore — Cloudflare R2

> Réf. CHANTIER D (mission rebrand 2026-05-10).

---

## 🎯 Stratégie

- **Backup quotidien automatique** : `scripts/backup-sqlite.js` planifié à 02h00 Africa/Casablanca via `cron/index.js`
- **Storage** : Cloudflare R2 (10 GB gratuit, 0 frais d'egress)
- **Format** : `sqlite/YYYY/MM/DD.sqlite.gz` — gzip niveau 9 (typiquement ~70% de compression sur SQLite)
- **Rétention** : 30 jours par défaut (configurable via `BACKUP_RETENTION_DAYS`)
- **Pre-backup** : WAL checkpoint forcé pour flusher les écritures non-committées

---

## ✅ Setup Cloudflare R2 (one-shot, ~10 min)

### Étape 1 — Créer un bucket
1. https://dash.cloudflare.com → R2 → **Create bucket**
2. Nom : `parentatease-backups`
3. Location : automatic (Cloudflare choisit la région la plus proche)
4. Storage class : Standard

### Étape 2 — Générer un API Token
1. R2 → **Manage R2 API Tokens** → **Create API Token**
2. Token name : `parentatease-backup-prod`
3. Permissions : **Object Read & Write**
4. Scope : Bucket spécifique → `parentatease-backups`
5. TTL : laisse vide (token permanent — sera révoqué manuellement si compromis)
6. Copier dans un password manager :
   - `Access Key ID`
   - `Secret Access Key`
   - Note ton `Account ID` (dans l'URL ou la section R2 > Overview)

### Étape 3 — Configurer Railway
Service `bot` → onglet Variables :
```
R2_ACCOUNT_ID=abc123...                # 32 chars
R2_ACCESS_KEY_ID=...                    # ~32 chars
R2_SECRET_ACCESS_KEY=...                # ~64 chars
R2_BUCKET=parentatease-backups         # optionnel, défaut OK
BACKUP_RETENTION_DAYS=30               # optionnel, défaut 30
```

Redeploy auto. Vérifier dans les logs au boot :
```
[info] Cron: SQLite backup scheduled (02:00 daily, R2 configured)
```

### Étape 4 — Test manuel (optionnel)
Depuis la console Railway (one-off run) ou en local avec les mêmes env vars :
```bash
npm run backup:sqlite
```

Sortie attendue :
```
📦 Backup /data/parenting_coach.db → R2://parentatease-backups/
   ✓ WAL checkpoint done
   ✓ Uploaded sqlite/2026/05/10.sqlite.gz
   • raw: 64.0 KB
   • gz : 18.4 KB (71% saved)
   • time: 1.2s

✅ Backup complete.
```

---

## 🔁 Restauration depuis backup

### Scénario 1 — Corruption locale, DB en prod corrompue

1. Identifier la date de backup propre (ex: `2026-05-08`)
2. Télécharger depuis R2 :
   ```bash
   # Avec rclone (recommandé) ou aws CLI
   aws s3 cp \
     --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
     s3://parentatease-backups/sqlite/2026/05/08.sqlite.gz \
     ./restore.sqlite.gz
   ```
3. Décompresser et vérifier l'intégrité :
   ```bash
   gunzip restore.sqlite.gz
   sqlite3 restore.sqlite "PRAGMA integrity_check;"
   # Doit afficher : ok
   ```
4. Sur Railway (one-off run, bot arrêté) :
   ```bash
   cp restore.sqlite /data/parenting_coach.db
   ```
5. Redémarrer le service Railway. Vérifier `/health` + bot répond.

### Scénario 2 — Migration vers un nouveau serveur
1. Télécharger le dernier backup (cf. scénario 1)
2. Déposer le fichier `.sqlite` au chemin défini par `DB_PATH` sur le nouveau serveur
3. Démarrer le bot — il lit la DB existante, schémas auto-créés via `CREATE TABLE IF NOT EXISTS`

---

## 🔍 Inspection des backups disponibles

```bash
# Lister les backups
aws s3 ls \
  --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
  s3://parentatease-backups/sqlite/ \
  --recursive

# Ou via Cloudflare Dashboard → R2 → parentatease-backups → Objects
```

---

## 🚨 Alerte sur échec backup

Le cron loggue via Winston. Pour alerting actif :
1. Sentry ou Better Stack → ingest les logs Railway
2. Filter `Cron job backup-sqlite failed`
3. Notification Slack/email

À implémenter dans le sprint suivant.

---

## 📊 Coût estimé

Cloudflare R2 tarifs :
- Storage : 0,015 USD/GB/mois (gratuit jusqu'à 10 GB)
- Class A operations (PUT, LIST) : 4,50 USD / million (gratuit jusqu'à 1M/mois)
- Egress : 0 USD/GB ← **avantage R2 vs S3**

ParentAtEase backups (estimation) :
- 30 backups/mois × ~50 KB chacun = 1,5 MB total → **gratuit**
- 30 PUT/mois = 30 ops → **gratuit**

Coût mensuel : **0 USD** jusqu'à plusieurs années d'historique.

---

## 🔐 Rotation des credentials R2

Tous les 6 mois ou en cas de suspicion de leak :
1. R2 → API Tokens → trouver `parentatease-backup-prod` → **Roll**
2. Nouveau Access Key / Secret générés
3. Update Railway env vars
4. Vérifier qu'un backup s'exécute correctement avec les nouvelles credentials
5. Désactiver l'ancien token sur R2
