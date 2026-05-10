# Workflow Rédaction — 3 Articles par Semaine
> ParentEase · Stratégie de contenu EEAT · Dernière mise à jour : 2026-04-15

## Vue d'ensemble

Chaque auteur produit **3 articles/semaine** sur un planning **Lundi · Mercredi · Vendredi**.
Chaque article déclenche automatiquement un pipeline complet : rédaction → SEO → photo → vidéo → posts sociaux.

### Auteurs actifs

| Auteur | Spécialité | Région | Profil |
|--------|-----------|--------|--------|
| Dr. Amara Diallo | Pédiatrie · Développement 0–6 ans | Montréal, Canada | [profil](authors/dr-amara-diallo.md) |
| Étienne Bouchard | Sommeil enfant · Méthode Douce Nuit | Vancouver, Canada | [profil](authors/etienne-bouchard.md) |

---

## Structure du pipeline par article

```
ARTICLE
  ├── 1. Brief éditorial (sujet + mot-clé + spécialité)
  ├── 2. Rédaction IA (1 400–1 800 mots, EEAT, FAQ schema)
  ├── 3. Review humaine (ton, exactitude, EEAT)
  ├── 4. Photo brief → génération Fal.ai Flux
  ├── 5. Vidéo brief → script court (YouTube/Reel)
  └── 6. Posts sociaux → X · Instagram · LinkedIn
```

---

## Phase 1 — Rédaction (automatisée)

### Commandes

```bash
# Générer les 3 articles de la semaine pour un auteur
npm run weekly -- --author etienne-bouchard --week 1
npm run weekly -- --author dr-amara-diallo --week 1

# Avec pipeline social inclus (génère aussi X + IG + LI + visuel)
npm run weekly -- --author etienne-bouchard --week 1 --social

# Voir le plan sans générer (dry run)
npm run weekly -- --author dr-amara-diallo --week 3 --dry-run

# Générer un seul article de la semaine (ex: article 2)
npm run weekly -- --author etienne-bouchard --week 2 --article 2

# Générer un article custom (hors planning)
npm run article -- \
  --topic "Mon sujet" \
  --keyword "mot-clé SEO" \
  --author "Dr. Amara Diallo"
```

### Sortie
- Fichier markdown : `landing/blog/drafts/<date>-<slug>.md`
- Front-matter automatique : title, description, keyword, author, date, reading_time

### Standards rédactionnels (injectés dans le prompt)
- **Longueur :** 1 400–1 800 mots
- **Structure :** H1 → 4 H2 minimum → "Ce que tu peux faire dès ce soir" → FAQ (4–6 questions)
- **Mot-clé :** dans H1, premier paragraphe, ≥ 2 H2, méta description (140–160 chars)
- **Voix :** chaleureux, empathique, sans jugement — adapté à la voix de l'auteur
- **Citations :** auteur + année uniquement (jamais d'URL inventée)
- **Sources knowledge base :** discipline-positive, CNV, attachement, développement, sommeil

---

## Phase 2 — Review humaine

Avant publication, vérifier dans chaque draft :

### Checklist EEAT
- [ ] L'auteur est bien crédité avec titre + institution
- [ ] Au moins 1 référence à sa pratique clinique ("Dans ma clinique...")
- [ ] Au moins 1 publication ou étude citée (réelle)
- [ ] Ton cohérent avec le profil auteur (voir directives de ton dans chaque profil)

### Checklist SEO
- [ ] Mot-clé dans H1, premier paragraphe, ≥ 2 H2
- [ ] Méta description 140–160 chars avec mot-clé
- [ ] FAQ en fin d'article (4–6 questions, format schema-ready)
- [ ] Pas de keyword stuffing (densité ≈ 1%)
- [ ] Liens internes vers autres articles du blog (si existants)

### Checklist contenu
- [ ] Chaque H2 contient une action concrète pour le parent
- [ ] Aucune URL inventée, aucun chiffre non sourçable
- [ ] Adapté aux familles multiculturelles (pas uniquement occidental)
- [ ] Section "Pour aller plus loin" avec CTA vers le bot ParentEase

---

## Phase 3 — Photo

### Briefs visuels générés automatiquement
Le pipeline social (`npm run social`) génère automatiquement un prompt Fal.ai/Flux dans :
`landing/blog/social/<date>-<slug>/visual-prompt.txt`

Si `FAL_API_KEY` est défini, l'image est générée directement dans `visual.png`.

### Style visuel ParentEase
- **Palette :** beiges, oranges doux (#fb923c), verts sauge, blancs crème
- **Style :** chaleureux, lumineux, familles diverses (origines variées)
- **Éviter :** photos de stock clichées, sourires forcés, décors trop "premium"
- **Formats produits :**
  - `1200 × 628` (hero article / Open Graph)
  - `1080 × 1080` (Instagram carré)
  - `1080 × 1350` (Instagram portrait — à recadrer depuis le 4:3)

### Briefs spécifiques par auteur

**Dr. Amara Diallo — Pédiatrie**
- Scènes : consultation médicale bienveillante, bébé examiné par une pédiatre WOC, famille multiculturelle en visite médicale
- Tonalité : confiance médicale + chaleur humaine
- Éléments récurrents : stéthoscope, bébé de moins d'1 an, parents attentifs

**Étienne Bouchard — Sommeil**
- Scènes : bébé qui dort paisiblement, parent qui borde son enfant, chambre douce et tamisée la nuit
- Tonalité : sérénité, nuit douce, sécurité
- Éléments récurrents : lumière tamisée, lit douillet, bébé endormi, parent au calme

---

## Phase 4 — Vidéo

Pour chaque article, produire un **brief vidéo court** utilisable pour :
- **YouTube** (10–15 min, format tutorial/talk) — Dr. Amara Diallo
- **YouTube Shorts / Instagram Reel** (30–60 sec) — Étienne Bouchard

### Template brief vidéo

```
TITRE VIDÉO : [proche du H1 de l'article, optimisé pour la recherche YouTube]
FORMAT : YouTube 10–15 min | Reel 60 sec
AUTEUR : [Nom]

HOOK (3 premières secondes) :
"[Phrase d'accroche directe qui pose le problème du parent]"

PLAN EN 5 POINTS :
1. Le problème que tu connais bien (30s)
2. Ce que la science dit vraiment (2–3 min)
3. La méthode pratique étape par étape (5 min)
4. Les erreurs à éviter (2 min)
5. Le conseil du praticien (1 min)

CTA FINAL :
"Pour un accompagnement quotidien personnalisé, ParentEase est là sur WhatsApp et Telegram."

HASHTAGS YOUTUBE : #parentalité #[spécialité] #[auteur_tag]
```

### Briefs vidéo automatiques (à venir — Phase 5)
Un Agent 4 "Video Brief" sera ajouté au pipeline `article-to-social.js` pour générer ce brief automatiquement à partir du markdown de l'article.

---

## Phase 5 — Posts sociaux (automatisés)

```bash
npm run social -- --input landing/blog/drafts/<fichier>.md
```

Génère dans `landing/blog/social/<date>-<slug>/` :
- `x.txt` — tweet ≤280 chars (hook fort + insight + CTA)
- `instagram.txt` — caption émotionnelle + 10–15 hashtags
- `linkedin.txt` — post professionnel 800–1 200 chars
- `visual-prompt.txt` — prompt Fal.ai pour l'image
- `visual.png` — image générée (si FAL_API_KEY défini)

---

## Calendrier éditorial hebdomadaire

```
LUNDI      → Article 1 généré + review → publication à 09h00
MERCREDI   → Article 2 généré + review → publication à 09h00
VENDREDI   → Article 3 généré + review → publication à 09h00

VENDREDI   → Pipeline social lancé pour les 3 articles de la semaine
DIMANCHE   → Posts programmés pour la semaine suivante (Postiz / manuel)
```

---

## Planning 12 semaines — Dr. Amara Diallo

| Semaine | Thème | Spécialités couvertes |
|---------|-------|----------------------|
| S1 | Suivi pédiatrique & jalons 0–3 mois | Santé nourrisson · Développement neuro |
| S2 | Signes d'alerte & stimulation cérébrale | Développement neuro |
| S3 | Médecine transculturelle & vaccins immigrants | Transculturel · Vaccination |
| S4 | Nouveau-né & nutrition précoce | Santé nourrisson |
| S5 | Langage & bilinguisme | Développement neuro · Transculturel |
| S6 | Diversité familiale & santé inclusive | Transculturel |
| S7 | Infections & urgences pédiatriques | Santé nourrisson |
| S8 | Neurodivergence & dépistage précoce | Développement neuro |
| S9 | Prévention & immunité | Vaccination |
| S10 | Santé en voyage & allaitement | Vaccination · Santé nourrisson |
| S11 | Peau, écrans & sommeil (perspective médicale) | Santé nourrisson · Transculturel |
| S12 | Guides complets & synthèses | Tous |

**Total : 36 articles · 36 séries de posts sociaux · 36 visuels**

---

## Planning 12 semaines — Étienne Bouchard

| Semaine | Thème | Spécialités couvertes |
|---------|-------|----------------------|
| S1 | Bases du sommeil & méthodes douces | Sans pleurs |
| S2 | Sommeil prématuré & environnement sécurisé | Prématuré |
| S3 | Méthodes de sevrage nocturne comparées | Sans pleurs |
| S4 | Transitions & changements de contexte | Transitions crèche-maison |
| S5 | Régressions & terreurs nocturnes | Sans pleurs |
| S6 | Sommeil et neurodivergence (TDAH, TSA) | TDAH |
| S7 | Nuits 0–6 mois & allaitement nocturne | Sans pleurs |
| S8 | Prématurité avancée — post-NICU | Prématuré |
| S9 | Sommeil scolaire & écrans | Transitions |
| S10 | Toddler & refus de coucher | Sans pleurs |
| S11 | Adolescent & décalage circadien | Transitions |
| S12 | Méthode Douce Nuit — guide & synthèses | Sans pleurs |

**Total : 36 articles · 36 séries de posts sociaux · 36 visuels**

---

## Ajouter un nouvel auteur

1. Créer `docs/editorial/authors/<author-id>.md` (copier template existant)
2. Créer `scripts/content-plans/<author-id>.json` (12 semaines × 3 articles)
3. Lancer : `npm run weekly -- --author <author-id> --week 1 --dry-run` pour vérifier
4. Annoncer dans `SOMMAIRE.md` sous la section Blog

---

## Structure des fichiers éditoriaux

```
docs/editorial/
  workflow-redaction.md          ← ce fichier
  authors/
    dr-amara-diallo.md           ← profil + directives de ton
    etienne-bouchard.md          ← profil + directives de ton

scripts/
  weekly-content.js              ← script batch 3 articles/semaine
  generate-article.js            ← génération article unitaire
  article-to-social.js           ← pipeline social (X + IG + LI + visuel)
  content-plans/
    dr-amara-diallo.json         ← banque 12 semaines × 3 sujets
    etienne-bouchard.json        ← banque 12 semaines × 3 sujets

landing/blog/
  drafts/                        ← articles générés (review avant publication)
  social/                        ← posts sociaux par article
```
