#!/usr/bin/env node
'use strict';

/**
 * generate-sitemap.js — Génère sitemap.xml + robots.txt pour ParentAtEase
 *
 * Scanne :
 *   landing/             (FR)
 *   landing/en, es, pt, ar
 *   landing/blog/*.html  (articles publiés, hors drafts/)
 *
 * Produit :
 *   landing/sitemap.xml
 *   landing/robots.txt
 *
 * Usage :
 *   node scripts/generate-sitemap.js [--site-url https://parentatease.netlify.app]
 *
 * À lancer après chaque déploiement (cf. package.json postdeploy).
 */

const fs   = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc[a.slice(2)] = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
  return acc;
}, {});

const SITE_URL = (args['site-url'] || process.env.SITE_URL || 'https://parentatease.netlify.app').replace(/\/$/, '');
const ROOT     = path.join(__dirname, '..', 'landing');

const LOCALES = ['', 'en', 'es', 'pt', 'ar'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function listHtml(dir, opts = {}) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.html'))
    .filter(e => !opts.excludePrefix || !e.name.startsWith(opts.excludePrefix))
    .map(e => path.join(dir, e.name));
}

function urlFromFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  // index.html → /
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

function lastmod(file) {
  return new Date(fs.statSync(file).mtime).toISOString().slice(0, 10);
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Collect URLs ────────────────────────────────────────────────────────────
const urls = [];

// Root + locales
for (const loc of LOCALES) {
  const dir = loc ? path.join(ROOT, loc) : ROOT;
  for (const f of listHtml(dir)) {
    urls.push({
      loc:      SITE_URL + urlFromFile(f),
      lastmod:  lastmod(f),
      priority: f.endsWith('index.html') ? '1.0' : '0.8',
      changefreq: f.endsWith('index.html') ? 'weekly' : 'monthly'
    });
  }
}

// Blog articles (HTML only, published — exclude /drafts/)
const blogDir = path.join(ROOT, 'blog');
for (const f of listHtml(blogDir)) {
  urls.push({
    loc:      SITE_URL + urlFromFile(f),
    lastmod:  lastmod(f),
    priority: '0.9',
    changefreq: 'monthly'
  });
}

// Author pages (if /auteurs/ exists)
const authorsDir = path.join(ROOT, 'auteurs');
for (const f of listHtml(authorsDir)) {
  urls.push({
    loc:      SITE_URL + urlFromFile(f),
    lastmod:  lastmod(f),
    priority: '0.85',
    changefreq: 'monthly'
  });
}

// De-dupe
const seen = new Set();
const dedup = urls.filter(u => seen.has(u.loc) ? false : (seen.add(u.loc), true));

// ─── sitemap.xml ─────────────────────────────────────────────────────────────
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...dedup.map(u => [
    '  <url>',
    `    <loc>${escapeXml(u.loc)}</loc>`,
    `    <lastmod>${u.lastmod}</lastmod>`,
    `    <changefreq>${u.changefreq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>'
  ].join('\n')),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml — ${dedup.length} URLs → ${path.join(ROOT, 'sitemap.xml')}`);

// ─── robots.txt ──────────────────────────────────────────────────────────────
const robots = `# robots.txt — ParentAtEase
User-agent: *
Allow: /
Disallow: /blog/drafts/
Disallow: /api/
Disallow: /webapp/

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
console.log(`✅ robots.txt → ${path.join(ROOT, 'robots.txt')}`);
