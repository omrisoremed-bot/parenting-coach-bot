#!/usr/bin/env node
'use strict';

/**
 * inject-jsonld.js — Injecte le JSON-LD schema.org dans les articles HTML
 *
 * Pour chaque landing/blog/*.html :
 *   - Article (title, datePublished, dateModified, author, publisher)
 *   - Person (auteur — si profil disponible dans docs/editorial/authors/)
 *   - FAQPage (extrait des H3 + paragraphes après "## Questions fréquentes")
 *   - BreadcrumbList (Accueil → Blog → Article)
 *
 * Idempotent : remplace le bloc <script type="application/ld+json" data-pe-jsonld> existant.
 *
 * Usage :
 *   node scripts/inject-jsonld.js
 *   node scripts/inject-jsonld.js --site-url https://parentatease.netlify.app
 *   node scripts/inject-jsonld.js --file landing/blog/sommeil-enfant.html
 */

const fs   = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc[a.slice(2)] = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
  return acc;
}, {});

const SITE_URL  = (args['site-url'] || process.env.SITE_URL || 'https://parentatease.netlify.app').replace(/\/$/, '');
const ROOT      = path.join(__dirname, '..');
const BLOG_DIR  = path.join(ROOT, 'landing', 'blog');
const AUTHOR_DIR = path.join(ROOT, 'docs', 'editorial', 'authors');

// ─── Author profiles → Person schema ─────────────────────────────────────────
function loadAuthorProfile(name) {
  if (!name || !fs.existsSync(AUTHOR_DIR)) return null;
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const candidates = fs.readdirSync(AUTHOR_DIR).filter(f => f.endsWith('.md'));
  for (const f of candidates) {
    const fileSlug = f.replace('.md', '');
    if (slug.includes(fileSlug) || fileSlug.includes(slug.split('-').slice(-2).join('-'))) {
      return parseAuthorMd(path.join(AUTHOR_DIR, f));
    }
  }
  return null;
}

function parseAuthorMd(filepath) {
  const md = fs.readFileSync(filepath, 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  const meta = {};
  if (fm) {
    fm[1].split('\n').forEach(l => {
      const [k, ...v] = l.split(':');
      if (k && v.length) meta[k.trim()] = v.join(':').trim();
    });
  }
  // Extract bio
  const bioMatch = md.match(/##\s+Bio[^\n]*\n+([\s\S]+?)\n##/);
  meta.bio = bioMatch ? bioMatch[1].trim() : '';
  // Extract role
  const titreMatch = md.match(/\*\*Titre\s*:\*\*\s*([^\n]+)/);
  meta.jobTitle = titreMatch ? titreMatch[1].trim() : '';
  return meta;
}

function authorJsonLd(authorName) {
  const p = loadAuthorProfile(authorName);
  if (!p) {
    return { '@type': 'Person', name: authorName };
  }
  return {
    '@type':       'Person',
    name:          p.nom || authorName,
    jobTitle:      p.jobTitle || '',
    description:   p.bio || '',
    url:           `${SITE_URL}/auteurs/${p.slug || ''}`,
    image:         p.image || undefined
  };
}

// ─── Extract metadata from HTML ──────────────────────────────────────────────
function extract(html, regex, group = 1) {
  const m = html.match(regex);
  return m ? m[group].trim() : '';
}

function extractFaq(html) {
  // Look for H2 "Questions fréquentes" or "FAQ" then collect H3 + p pairs
  const faqStart = html.search(/<h2[^>]*>\s*(?:Questions fréquentes|FAQ|Foire aux questions)/i);
  if (faqStart < 0) return [];

  const segment = html.slice(faqStart);
  const items = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(segment)) !== null && items.length < 12) {
    items.push({
      '@type':         'Question',
      name:            stripTags(m[1]).trim(),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(m[2]).trim() }
    });
  }
  return items;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Build JSON-LD for one article ───────────────────────────────────────────
function buildJsonLd(filepath) {
  const html  = fs.readFileSync(filepath, 'utf8');
  const slug  = path.basename(filepath, '.html');
  const url   = `${SITE_URL}/blog/${slug}.html`;

  const title       = extract(html, /<title>([^<]+)<\/title>/i) ||
                      extract(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const description = extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const author      = extract(html, /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
                      extract(html, /data-author=["']([^"']+)["']/i);
  const datePub     = extract(html, /<meta\s+(?:property|name)=["'](?:article:published_time|date)["']\s+content=["']([^"']+)["']/i) ||
                      new Date(fs.statSync(filepath).birthtime).toISOString().slice(0, 10);
  const dateMod     = new Date(fs.statSync(filepath).mtime).toISOString().slice(0, 10);
  const image       = extract(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                      `${SITE_URL}/blog/og/${slug}.png`;
  const keyword     = extract(html, /<meta\s+name=["']keywords?["']\s+content=["']([^"']+)["']/i);

  const faqEntries = extractFaq(html);

  const graph = [
    {
      '@type':           'Article',
      '@id':             url + '#article',
      headline:          title,
      description,
      image,
      keywords:          keyword,
      datePublished:     datePub,
      dateModified:      dateMod,
      author:            authorJsonLd(author),
      publisher: {
        '@type': 'Organization',
        name:    'ParentAtEase',
        url:     SITE_URL,
        logo:   { '@type': 'ImageObject', url: `${SITE_URL}/assets/logo.png` }
      },
      mainEntityOfPage:  { '@type': 'WebPage', '@id': url }
    },
    {
      '@type':          'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Le journal', item: SITE_URL + '/blog/' },
        { '@type': 'ListItem', position: 3, name: title, item: url }
      ]
    }
  ];

  if (faqEntries.length >= 2) {
    graph.push({
      '@type':      'FAQPage',
      '@id':        url + '#faq',
      mainEntity:   faqEntries
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph':   graph
  };
}

// ─── Inject (idempotent) ─────────────────────────────────────────────────────
function inject(filepath) {
  const html = fs.readFileSync(filepath, 'utf8');
  const json = buildJsonLd(filepath);
  const block = `<script type="application/ld+json" data-pe-jsonld>\n${JSON.stringify(json, null, 2)}\n</script>`;

  // Remove old block if present
  let next = html.replace(/<script type="application\/ld\+json" data-pe-jsonld>[\s\S]*?<\/script>\s*/g, '');

  // Insert before </head>
  if (!/<\/head>/i.test(next)) {
    console.warn(`⚠️  ${path.basename(filepath)} : no </head> tag — skipped`);
    return false;
  }
  next = next.replace(/<\/head>/i, `  ${block}\n</head>`);
  fs.writeFileSync(filepath, next, 'utf8');
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function listArticleFiles() {
  if (args.file) return [path.resolve(args.file)];
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => path.join(BLOG_DIR, f));
}

const files = listArticleFiles();
if (!files.length) {
  console.log('ℹ️  Aucun article HTML trouvé dans landing/blog/');
  process.exit(0);
}

let ok = 0, fail = 0;
for (const f of files) {
  try {
    inject(f) ? ok++ : fail++;
    console.log(`✅ ${path.basename(f)}`);
  } catch (err) {
    console.error(`❌ ${path.basename(f)} : ${err.message}`);
    fail++;
  }
}
console.log(`\n📦 JSON-LD injecté dans ${ok}/${ok + fail} articles. Site URL : ${SITE_URL}`);
