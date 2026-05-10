#!/usr/bin/env node
'use strict';

/**
 * migrate-db-to-volume.js — One-shot SQLite migration to Railway persistent volume.
 *
 * This is an EXPLICIT migration script for the case where:
 *   - You've added a Railway volume mounted at /data
 *   - You want to force-copy the existing data/ directory contents to it
 *   - You want to run this BEFORE bot.js starts (e.g., as a one-off Railway run)
 *
 * In production, services/database.js performs the same migration LAZILY on
 * first boot if DB_PATH points to /data and the target file is missing.
 *
 * Run :
 *   DB_PATH=/data/parenting_coach.db node scripts/migrate-db-to-volume.js
 *   npm run db:migrate-volume
 *
 * Exit codes:
 *   0 = migration done or not needed
 *   1 = source missing or copy failed
 */

const fs   = require('fs');
const path = require('path');

const LEGACY_DIR  = path.join(__dirname, '..', 'data');
const LEGACY_PATH = path.join(LEGACY_DIR, 'parenting_coach.db');
const TARGET      = process.env.DB_PATH;

if (!TARGET) {
  console.error('❌ DB_PATH env var not set. Example:');
  console.error('   DB_PATH=/data/parenting_coach.db node scripts/migrate-db-to-volume.js');
  process.exit(1);
}

if (TARGET === LEGACY_PATH) {
  console.log('ℹ️  DB_PATH = LEGACY_PATH, nothing to migrate');
  process.exit(0);
}

if (fs.existsSync(TARGET)) {
  console.log(`ℹ️  Target already exists at ${TARGET}, migration skipped (idempotent)`);
  process.exit(0);
}

if (!fs.existsSync(LEGACY_PATH)) {
  console.log(`ℹ️  No legacy DB at ${LEGACY_PATH}, nothing to migrate`);
  process.exit(0);
}

const targetDir = path.dirname(TARGET);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`✓ Created target dir ${targetDir}`);
}

try {
  fs.copyFileSync(LEGACY_PATH, TARGET);
  console.log(`✓ ${LEGACY_PATH} → ${TARGET}`);

  // Copy WAL + SHM if present (preserve uncommitted writes)
  for (const suffix of ['-wal', '-shm']) {
    const src = LEGACY_PATH + suffix;
    const dst = TARGET + suffix;
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`✓ ${src} → ${dst}`);
    }
  }

  console.log('\n✅ Migration complete. You can now safely delete the legacy directory if desired.');
} catch (err) {
  console.error(`❌ Migration failed: ${err.message}`);
  process.exit(1);
}
