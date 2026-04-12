'use strict';

/**
 * migrate-json-to-sqlite.js
 *
 * Migre les profils JSON existants vers SQLite.
 * Idempotent : peut être exécuté plusieurs fois sans dupliquer les données.
 *
 * Usage :
 *   node scripts/migrate-json-to-sqlite.js
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const USERS_DIR  = path.join(__dirname, '..', 'users');
const { saveProfile } = require('../handlers/profileLoader');

function migrate() {
  if (!fs.existsSync(USERS_DIR)) {
    console.log('✅ Dossier users/ introuvable — rien à migrer.');
    return;
  }

  const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('✅ Aucun fichier JSON trouvé — rien à migrer.');
    return;
  }

  console.log(`📂 ${files.length} profil(s) JSON trouvé(s). Migration en cours...`);

  let ok = 0, skip = 0;

  for (const file of files) {
    const filePath = path.join(USERS_DIR, file);
    try {
      const raw     = fs.readFileSync(filePath, 'utf8');
      const profile = JSON.parse(raw);

      if (!profile.phone) {
        console.warn(`  ⚠️  ${file} : champ 'phone' manquant — ignoré`);
        skip++;
        continue;
      }

      saveProfile(profile.phone, profile);
      console.log(`  ✅ ${profile.phone} migré`);
      ok++;
    } catch (err) {
      console.error(`  ❌ ${file} : ${err.message}`);
      skip++;
    }
  }

  console.log(`\n📊 Résultat : ${ok} migré(s), ${skip} ignoré(s)`);
  console.log('💾 Base SQLite : data/parenting_coach.db');
  console.log('\n💡 Les fichiers JSON sont conservés dans users/ comme backup.');
  console.log('   Supprime-les manuellement quand tu es sûr que tout fonctionne.');
}

migrate();
