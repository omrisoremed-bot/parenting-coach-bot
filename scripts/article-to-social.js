#!/usr/bin/env node
'use strict';

/**
 * article-to-social.js — Moteur de contenu social ParentEase (Phase 4b)
 *
 * Transforme un article de blog en 3 posts plateforme-natifs via un pipeline
 * multi-agents séquentiel :
 *   Agent 1 (Writer)       → brouillons X + Instagram + LinkedIn
 *   Agent 2 (Editor)       → révision et amélioration de chaque post
 *   Agent 3 (Visual Brief) → prompt Fal.ai/Flux pour l'image d'illustration
 *   [Optionnel] Fal.ai     → génération de l'image si FAL_API_KEY est défini
 *
 * Usage :
 *   node scripts/article-to-social.js --input landing/blog/drafts/2026-04-15-slug.md
 *   node scripts/article-to-social.js --input landing/blog/drafts/2026-04-15-slug.md --lang fr
 *
 * Sortie : landing/blog/social/<date>-<slug>/
 *   x.txt             (≤280 chars, hook fort + insight + CTA)
 *   instagram.txt     (caption émotionnelle + 10-15 hashtags)
 *   linkedin.txt      (post professionnel ~800-1200 chars)
 *   visual-prompt.txt (prompt détaillé pour Fal.ai / Midjourney)
 *   visual.png        (image générée — seulement si FAL_API_KEY défini)
 *
 * Variables d'env utilisées :
 *   AI_API_KEY, AI_BASE_URL, AI_MODEL   → même provider que le bot
 *   FAL_API_KEY                         → Fal.ai (optionnel, fal.ai/dashboard)
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');

// ─── CLI args ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key   = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

const args  = parseArgs(process.argv);
const input = args.input;
const lang  = args.lang || 'fr';
const model = args.model || process.env.AI_MODEL || 'mistralai/mistral-large-2-instruct';

if (!input) {
  console.error(`
❌ Manquant : --input

Usage :
  node scripts/article-to-social.js --input landing/blog/drafts/<fichier>.md [--lang fr]

Options :
  --input   Chemin vers le fichier markdown de l'article  (requis)
  --lang    Langue des posts : fr|en|ar|darija            (défaut = fr)
  --model   Modèle LLM                                    (défaut = \$AI_MODEL)
`);
  process.exit(1);
}

// ─── Lire l'article ──────────────────────────────────────────────────────────
const articlePath = path.resolve(input);
if (!fs.existsSync(articlePath)) {
  console.error(`❌ Fichier introuvable : ${articlePath}`);
  process.exit(1);
}
const articleContent = fs.readFileSync(articlePath, 'utf8');

// Extraire le slug depuis le nom de fichier
const filename = path.basename(articlePath, '.md'); // ex: 2026-04-15-crises-colere
const slug     = filename.replace(/^\d{4}-\d{2}-\d{2}-/, ''); // ex: crises-colere

// Extraire le titre du frontmatter si présent
const titleMatch = articleContent.match(/^title:\s*["']?(.+?)["']?\s*$/m);
const articleTitle = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');

// ─── LLM client ──────────────────────────────────────────────────────────────
const client = new OpenAI({
  apiKey:  process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1'
});

async function callAgent(systemPrompt, userPrompt, agentName) {
  const started = Date.now();
  process.stdout.write(`   ⏳ ${agentName}...`);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt }
    ],
    max_tokens:  2048,
    temperature: 0.75,
    top_p:       0.95
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const text = response.choices[0]?.message?.content || '';
  console.log(` ✅ ${elapsed}s`);
  return text;
}

// ─── Agent 1 — Writer : génère les 3 brouillons ──────────────────────────────
const WRITER_SYSTEM = `Tu es un social media manager expert en parentalité et en marketing digital pour ParentEase.
Tu crées des posts engageants, authentiques et plateforme-natifs à partir d'articles de blog.

Langue cible : ${lang}

Règles absolues :
- X/Twitter : ≤280 caractères. Accroche émotionnelle ou chiffre surprenant en 1ère ligne. 1 hashtag max.
- Instagram  : caption émotionnelle de 150-300 mots. Emojis pertinents. Saut de ligne entre chaque idée.
  Terminer par une ligne vide puis 10-15 hashtags séparés par des espaces.
- LinkedIn   : ton professionnel mais humain. 800-1200 caractères. Format : accroche → 3 points clés → CTA.
  Pas d'emojis excessifs. 3-5 hashtags à la fin.

Format de sortie STRICT — réponds EXACTEMENT avec ces 3 blocs, rien d'autre :

===X===
[ton post X ici]
===END_X===

===INSTAGRAM===
[ton post Instagram ici]
===END_INSTAGRAM===

===LINKEDIN===
[ton post LinkedIn ici]
===END_LINKEDIN===`;

const WRITER_PROMPT = `Voici l'article de blog ParentEase à transformer en posts sociaux :

TITRE : ${articleTitle}

---
${articleContent.slice(0, 6000)}
---

Génère les 3 posts en ${lang} en suivant STRICTEMENT le format de sortie défini.`;

// ─── Agent 2 — Editor : améliore chaque post ─────────────────────────────────
const EDITOR_SYSTEM = `Tu es un éditeur senior en social media pour une marque de parentalité bienveillante.
Tu améliores des posts sociaux en les rendant plus percutants, authentiques, et engageants.

Langue cible : ${lang}

Critères d'amélioration :
- X       : le hook doit donner envie de lire la suite en ≤10 mots. CTA clair. ≤280 chars IMPÉRATIF.
- Instagram: l'émotion doit être présente dès la 1ère phrase. Les hashtags doivent être pertinents
  (ni trop génériques genre #love, ni trop niche). Pas de fautes.
- LinkedIn : ton d'expert bienveillant. La valeur doit être évidente dès le 2ème paragraphe.
  Un appel à l'action concret en fin de post.

Format de sortie STRICT — réponds EXACTEMENT avec ces 3 blocs, rien d'autre :

===X===
[post X amélioré]
===END_X===

===INSTAGRAM===
[post Instagram amélioré]
===END_INSTAGRAM===

===LINKEDIN===
[post LinkedIn amélioré]
===END_LINKEDIN===`;

function buildEditorPrompt(drafts) {
  return `Voici les brouillons de posts sociaux sur "${articleTitle}".
Améliore chaque post selon tes critères. Respecte la langue : ${lang}.

${drafts}

Renvoie les 3 posts améliorés dans le format demandé.`;
}

// ─── Agent 3 — Visual Brief : prompt image Fal.ai ────────────────────────────
const VISUAL_SYSTEM = `Tu es un directeur artistique spécialisé en content marketing pour la parentalité.
Tu crées des prompts de génération d'images (Flux/Midjourney) qui illustrent des articles de blog.

Le style visuel ParentEase :
- Chaleureux, lumineux, inclusif. Familles diverses (origines variées).
- Palette : beiges, oranges doux, verts sauge, blancs crème.
- Pas de photos de stock clichées. Moments authentiques, intimes, non posés.
- Pas de texte dans l'image.
- Format : 16:9 horizontal (pour blog) ou 4:5 (pour Instagram).

Réponds UNIQUEMENT avec le prompt anglais optimisé pour Flux Schnell, rien d'autre.
Le prompt doit faire 50-100 mots.`;

const VISUAL_PROMPT_REQUEST = `Génère un prompt Flux/Midjourney pour illustrer cet article :

Titre : ${articleTitle}
Extrait : ${articleContent.slice(0, 500)}

Le prompt doit capturer l'émotion principale de l'article dans une scène de vie familiale authentique.`;

// ─── Parseur de blocs ────────────────────────────────────────────────────────
function extractBlock(text, tag) {
  const re = new RegExp(`===${tag}===\\s*([\\s\\S]*?)===END_${tag}===`, 'i');
  const m  = text.match(re);
  return m ? m[1].trim() : '';
}

// ─── Fal.ai — génération d'image ─────────────────────────────────────────────
async function generateVisualWithFal(prompt, outputPath) {
  if (!process.env.FAL_API_KEY) {
    console.log('   ⏭️  FAL_API_KEY absent — génération visuelle ignorée');
    return null;
  }

  process.stdout.write('   ⏳ Fal.ai Flux (génération image)...');
  const started = Date.now();

  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://fal.run/fal-ai/flux/schnell',
      {
        prompt,
        image_size:           'landscape_4_3',
        num_inference_steps:  4,
        num_images:           1,
        enable_safety_checker: true
      },
      {
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
          'Content-Type':  'application/json'
        },
        timeout: 60000
      }
    );

    const imageUrl = response.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error('Pas d\'URL image dans la réponse Fal.ai');

    // Télécharger et sauvegarder l'image
    await downloadFile(imageUrl, outputPath);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(` ✅ ${elapsed}s`);
    return outputPath;

  } catch (err) {
    console.log(` ⚠️  échec (${err.message})`);
    return null;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ─── Pipeline principal ───────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 ParentEase — Social Content Pipeline');
  console.log('═══════════════════════════════════════════');
  console.log(`   Article  : ${articleTitle}`);
  console.log(`   Fichier  : ${path.relative(process.cwd(), articlePath)}`);
  console.log(`   Langue   : ${lang}`);
  console.log(`   Modèle   : ${model}`);
  console.log(`   Fal.ai   : ${process.env.FAL_API_KEY ? '✅ activé' : '⏭️  désactivé (FAL_API_KEY absent)'}`);
  console.log('═══════════════════════════════════════════\n');

  // ── Agent 1 : Writer ────────────────────────────────────────────────────────
  console.log('📝 Agent 1 — Writer (brouillons)');
  const drafts = await callAgent(WRITER_SYSTEM, WRITER_PROMPT, 'Génération des 3 posts');

  const draftX  = extractBlock(drafts, 'X');
  const draftIG = extractBlock(drafts, 'INSTAGRAM');
  const draftLI = extractBlock(drafts, 'LINKEDIN');

  if (!draftX && !draftIG && !draftLI) {
    console.error('❌ Agent Writer n\'a pas produit de posts valides. Vérifier le format de sortie.');
    console.error('Réponse brute :', drafts.slice(0, 500));
    process.exit(2);
  }

  // ── Agent 2 : Editor ────────────────────────────────────────────────────────
  console.log('\n✏️  Agent 2 — Editor (révision)');
  const edited = await callAgent(
    EDITOR_SYSTEM,
    buildEditorPrompt(drafts),
    'Révision et amélioration'
  );

  const finalX  = extractBlock(edited, 'X')  || draftX;
  const finalIG = extractBlock(edited, 'INSTAGRAM') || draftIG;
  const finalLI = extractBlock(edited, 'LINKEDIN')  || draftLI;

  // ── Agent 3 : Visual Brief ──────────────────────────────────────────────────
  console.log('\n🎨 Agent 3 — Visual Brief (prompt image)');
  const visualPrompt = await callAgent(
    VISUAL_SYSTEM,
    VISUAL_PROMPT_REQUEST,
    'Génération du prompt visuel'
  );

  // ── Sauvegarder les outputs ─────────────────────────────────────────────────
  const dateStr  = new Date().toISOString().slice(0, 10);
  const outDir   = path.join(__dirname, '..', 'landing', 'blog', 'social', `${dateStr}-${slug}`);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'x.txt'),             finalX,       'utf8');
  fs.writeFileSync(path.join(outDir, 'instagram.txt'),      finalIG,      'utf8');
  fs.writeFileSync(path.join(outDir, 'linkedin.txt'),       finalLI,      'utf8');
  fs.writeFileSync(path.join(outDir, 'visual-prompt.txt'),  visualPrompt, 'utf8');

  // ── Fal.ai : génération image (optionnelle) ─────────────────────────────────
  console.log('\n🖼️  Génération visuelle');
  const imagePath = path.join(outDir, 'visual.png');
  const generatedImage = await generateVisualWithFal(visualPrompt, imagePath);

  // ── Rapport final ────────────────────────────────────────────────────────────
  const relDir = path.relative(process.cwd(), outDir);

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ POSTS GÉNÉRÉS');
  console.log('═══════════════════════════════════════════\n');

  console.log(`📁 Dossier : ${relDir}/\n`);

  console.log('─── X / Twitter ──────────────────────────');
  console.log(finalX);
  console.log(`\n   📏 ${finalX.length}/280 caractères${finalX.length > 280 ? ' ⚠️  TROP LONG' : ' ✅'}\n`);

  console.log('─── Instagram ────────────────────────────');
  console.log(finalIG.slice(0, 300) + (finalIG.length > 300 ? '\n   [... +' + (finalIG.length - 300) + ' chars]' : ''));
  console.log('');

  console.log('─── LinkedIn ─────────────────────────────');
  console.log(finalLI.slice(0, 300) + (finalLI.length > 300 ? '\n   [... +' + (finalLI.length - 300) + ' chars]' : ''));
  console.log('');

  console.log('─── Visual prompt ────────────────────────');
  console.log(visualPrompt.slice(0, 200));
  console.log('');

  if (generatedImage) {
    console.log(`🖼️  Image : ${path.join(relDir, 'visual.png')}`);
  }

  console.log('\n🔎 Étapes suivantes :');
  console.log('   1. Review des posts (ton, longueur, pertinence)');
  console.log('   2. Vérifier que X ≤ 280 chars');
  console.log(`   3. Programmer via Postiz ou poster manuellement`);
  if (!process.env.FAL_API_KEY) {
    console.log('   4. Ajouter FAL_API_KEY dans .env pour générer les visuels automatiquement');
  }
  console.log('');
}

run().catch(err => {
  console.error('\n❌ Erreur pipeline :', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
