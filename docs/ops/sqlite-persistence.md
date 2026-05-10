# SQLite persistence on Railway — Setup procedure

> Réf. CHANTIER C (mission rebrand 2026-05-10).
> **Status sans cette procédure : chaque deploy Railway WIPE la base de données.**

---

## 🚨 Pourquoi c'est critique

Le filesystem Railway en dehors du chemin `/data` est **éphémère** :
- Chaque deploy = nouveau container = filesystem repart à zéro
- Sans volume monté, les profils utilisateurs, conversation_history, OTP codes et sessions **disparaissent** à chaque push sur `main`

**Conséquence actuelle** : tu perds tes utilisateurs à chaque release.

---

## ✅ Configuration en 4 étapes

### Étape 1 — Créer un volume sur Railway
1. https://railway.app/project/parenting-coach
2. Service `bot` → onglet **Settings** → section **Volumes**
3. **+ New Volume**
   - Mount path : `/data`
   - Size : 1 GB (largement suffisant pour SQLite, scaling jusqu'à ~100k users)
4. Cliquer **Add**. Railway redémarre le service automatiquement.

### Étape 2 — Configurer la variable `DB_PATH`
1. Service `bot` → onglet **Variables**
2. Ajouter :
   ```
   DB_PATH=/data/parenting_coach.db
   ```
3. Sauvegarder (re-deploy auto).

### Étape 3 — Vérifier la migration automatique
Au premier boot avec `DB_PATH=/data/parenting_coach.db` :
- `services/database.js` détecte que le fichier n'existe pas encore sur le volume
- Copie `./data/parenting_coach.db` (legacy, depuis le code) vers `/data/parenting_coach.db`
- Copie aussi `.db-wal` + `.db-shm` si présents

Vérifier dans les logs Railway :
```
[info] Migrating SQLite from legacy path to persistent volume {"from":".../data/parenting_coach.db","to":"/data/parenting_coach.db"}
[info] SQLite migration complete
[info] SQLite database ready {"path":"/data/parenting_coach.db"}
```

### Étape 4 — Validation
Après le deploy, faire un test de persistence :
1. Faire un changement profil utilisateur (par ex. répondre au bot)
2. **Trigger un re-deploy** (push commit vide ou bouton Redeploy)
3. Vérifier que les données sont toujours là :
   - Health check OK
   - Conversation user reprend où elle était
   - `/api/me` retourne le profil intact

Si OK : volume opérationnel ✅.

---

## 🔧 Migration manuelle (cas exceptionnel)

Si tu as besoin de forcer la migration :

```bash
# Sur Railway, en one-off run (railway run) :
DB_PATH=/data/parenting_coach.db node scripts/migrate-db-to-volume.js
```

Le script est idempotent : il refuse d'écraser un fichier existant.

---

## 📊 Monitoring du volume

Railway expose les métriques d'utilisation :
- Dashboard service → onglet **Metrics** → **Disk usage**
- Configurer une alerte à 80% de capacité (1 GB → 800 MB)

Pour une DB SQLite typique :
- 1 000 users avec 100 messages chacun ≈ 50 MB
- 10 000 users avec 200 messages chacun ≈ 500 MB
- → 1 GB tient large jusqu'à 20-30k users actifs

---

## 🔄 Lien avec le backup

Le volume `/data` est **fiable mais pas une sauvegarde**.
Le backup quotidien vers Cloudflare R2 (chantier D) couvre :
- Corruption fichier
- Erreur humaine (DROP TABLE, etc.)
- Catastrophe Railway

Voir `docs/ops/backup-restore.md` pour la procédure backup/restore.
