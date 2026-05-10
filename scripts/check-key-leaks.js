#!/usr/bin/env node
'use strict';

/**
 * check-key-leaks.js — Detect if any of our API keys leaked on public GitHub.
 *
 * Strategy:
 *   - For each watched env var, extract a distinctive prefix (15-20 chars)
 *   - Query GitHub Code Search API for that prefix
 *   - Alert if any result found
 *
 * Watched secrets:
 *   - AI_API_KEY               (OpenAI / compatible)
 *   - TELEGRAM_BOT_TOKEN
 *   - META_ACCESS_TOKEN
 *   - TWILIO_AUTH_TOKEN
 *   - GROQ_API_KEY
 *   - FAL_API_KEY
 *
 * Requires:
 *   - GITHUB_PAT env var (Personal Access Token, scope: public_repo read)
 *     Generate at: https://github.com/settings/tokens (classic, expiration 1y)
 *
 * Exit codes:
 *   0 = no leaks found
 *   2 = at least one leak detected (Railway should alert)
 *   1 = error (no GITHUB_PAT, network, etc.)
 *
 * Usage:
 *   node scripts/check-key-leaks.js
 *   GITHUB_PAT=ghp_... node scripts/check-key-leaks.js
 *
 * Schedule (Railway cron or external):
 *   0 4 * * *   npm run security:check-leaks
 */

require('dotenv').config();
const axios = require('axios');

const GITHUB_API = 'https://api.github.com';

// Each entry = [envVarName, prefixLength, description]
const SECRETS = [
  ['AI_API_KEY',          20, 'OpenAI / compatible LLM key'],
  ['TELEGRAM_BOT_TOKEN',  20, 'Telegram bot token'],
  ['META_ACCESS_TOKEN',   25, 'Meta WhatsApp Cloud API token'],
  ['TWILIO_AUTH_TOKEN',   16, 'Twilio auth token'],
  ['GROQ_API_KEY',        20, 'Groq Whisper API key'],
  ['FAL_API_KEY',         16, 'Fal.ai Flux generation key'],
];

const pat = process.env.GITHUB_PAT;
if (!pat) {
  console.error('❌ GITHUB_PAT env var missing. Generate one at https://github.com/settings/tokens (scope: public_repo).');
  process.exit(1);
}

async function searchOnGithub(prefix) {
  // Use exact-phrase search; GitHub returns up to 30 / request
  const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(`"${prefix}"`)}&per_page=1`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept:        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent':  'parentatease-leak-monitor',
    },
    timeout: 15_000,
    validateStatus: () => true,
  });

  if (res.status === 403) {
    // Rate limit or scope issue
    throw new Error(`GitHub API 403 (rate limit or PAT lacks code-search scope) — ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']}`);
  }
  if (res.status !== 200) {
    throw new Error(`GitHub API ${res.status}: ${JSON.stringify(res.data)?.slice(0, 200)}`);
  }
  return { count: res.data.total_count, firstHit: res.data.items?.[0]?.html_url };
}

(async function main() {
  const findings = [];
  for (const [varName, prefixLen, description] of SECRETS) {
    const value = process.env[varName];
    if (!value || value.length < prefixLen + 4) {
      console.log(`⏭️  ${varName} — not set, skipping`);
      continue;
    }

    const prefix = value.slice(0, prefixLen);
    // Never log the actual prefix — it would itself become a leak vector
    process.stdout.write(`🔍 ${varName} (${description})... `);

    try {
      const { count, firstHit } = await searchOnGithub(prefix);
      if (count > 0) {
        console.log(`🚨 LEAK (${count} hit${count > 1 ? 's' : ''})`);
        findings.push({ varName, count, firstHit });
      } else {
        console.log('✅ clean');
      }
      // GitHub Code Search has rate limit ~10 req/min for authenticated users
      await new Promise(r => setTimeout(r, 6500));
    } catch (err) {
      console.log(`⚠️  error: ${err.message}`);
    }
  }

  if (findings.length > 0) {
    console.error('\n══════════════════════════════════════════════════');
    console.error('🚨 KEY LEAK(S) DETECTED — ROTATE IMMEDIATELY');
    console.error('══════════════════════════════════════════════════');
    for (const { varName, count, firstHit } of findings) {
      console.error(`  ${varName}: ${count} hit(s) — first: ${firstHit}`);
    }
    console.error('\nAction: rotate via provider console, then update Railway env vars.\n');
    process.exit(2);
  }

  console.log('\n✅ No leaks detected across all watched secrets.');
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
