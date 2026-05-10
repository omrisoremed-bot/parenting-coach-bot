#!/usr/bin/env node
'use strict';

/**
 * backup-sqlite.js — Daily SQLite backup to Cloudflare R2 (S3-compatible).
 *
 * - Reads DB at DB_PATH (or legacy ./data/parenting_coach.db)
 * - Performs WAL checkpoint via better-sqlite3 to flush uncommitted writes
 * - Gzips the .db file
 * - Uploads to R2 bucket under key: sqlite/YYYY/MM/DD.sqlite.gz
 * - Optionally retains only last N days (env: BACKUP_RETENTION_DAYS, default 30)
 *
 * Required env vars:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET           (default: parentatease-backups)
 *
 * Optional:
 *   DB_PATH                  (default: ./data/parenting_coach.db)
 *   BACKUP_RETENTION_DAYS    (default: 30)
 *
 * Exit codes:
 *   0 = backup OK
 *   1 = config error (missing env var)
 *   2 = DB not found
 *   3 = upload failed
 *
 * Usage:
 *   node scripts/backup-sqlite.js
 *   npm run backup:sqlite
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const Database = require('better-sqlite3');

// ─── Config ──────────────────────────────────────────────────────────────────
const REQUIRED = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing R2 env vars: ${missing.join(', ')}`);
  console.error('   See docs/ops/backup-restore.md for setup');
  process.exit(1);
}

const BUCKET    = process.env.R2_BUCKET || 'parentatease-backups';
const DB_PATH   = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'parenting_coach.db');
const RETENTION = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ DB file not found: ${DB_PATH}`);
  process.exit(2);
}

// ─── R2 client (S3-compatible) ───────────────────────────────────────────────
const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function keyForDate(d = new Date()) {
  return `sqlite/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}.sqlite.gz`;
}

// WAL checkpoint to flush uncommitted writes into the .db file before backup
function checkpoint() {
  const db = new Database(DB_PATH, { readonly: false });
  try {
    db.pragma('wal_checkpoint(FULL)');
  } finally {
    db.close();
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async function main() {
  const start = Date.now();
  console.log(`📦 Backup ${DB_PATH} → R2://${BUCKET}/`);

  try {
    checkpoint();
    console.log('   ✓ WAL checkpoint done');
  } catch (err) {
    console.warn(`   ⚠️  Checkpoint failed (continuing): ${err.message}`);
  }

  const raw = fs.readFileSync(DB_PATH);
  const gz  = zlib.gzipSync(raw, { level: 9 });
  const key = keyForDate();

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key:    key,
      Body:   gz,
      ContentType:     'application/gzip',
      ContentEncoding: 'gzip',
      Metadata: {
        'source-path': DB_PATH,
        'raw-bytes':   String(raw.length),
        'created-at':  new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.error(`❌ Upload failed: ${err.message}`);
    process.exit(3);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`   ✓ Uploaded ${key}`);
  console.log(`   • raw: ${(raw.length / 1024).toFixed(1)} KB`);
  console.log(`   • gz : ${(gz.length / 1024).toFixed(1)} KB (${(100 - gz.length / raw.length * 100).toFixed(0)}% saved)`);
  console.log(`   • time: ${elapsed}s`);

  // ─── Retention pruning ─────────────────────────────────────────────────────
  if (RETENTION > 0) {
    try {
      const cutoff = new Date(Date.now() - RETENTION * 86_400_000);
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'sqlite/',
        MaxKeys: 1000,
      }));
      const toDelete = (list.Contents || []).filter(o => o.LastModified < cutoff);
      if (toDelete.length > 0) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: toDelete.map(o => ({ Key: o.Key })) },
        }));
        console.log(`   ✓ Pruned ${toDelete.length} backup(s) older than ${RETENTION} days`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Retention pruning failed (non-fatal): ${err.message}`);
    }
  }

  console.log('\n✅ Backup complete.');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(3);
});
