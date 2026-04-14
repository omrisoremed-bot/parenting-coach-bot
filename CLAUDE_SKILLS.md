# CLAUDE_SKILLS.md — skills à mobiliser par phase
> Cartographie des skills Claude Code utiles pour ce projet.
> Invocation : `/nom-du-skill` dans le chat, ou l'agent Claude les appelle via le tool `Skill`.

---

## 🧠 Sélection de modèle Claude par type de tâche

Claude Code permet de basculer entre modèles avec `/model <id>` (ou `/fast` pour le mode rapide). Trois modèles sont disponibles :

| Modèle | ID | Profil | Coût relatif |
|--------|-----|--------|--------------|
| **Claude Opus 4.6** | `claude-opus-4-6` | Raisonnement maximal, architecture, debug complexe, PRD, décisions | 💰💰💰 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Défaut équilibré : implémentation, code review, refactoring | 💰💰 |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | Vitesse/coût : edits simples, génération répétitive, boilerplate | 💰 |

### Règle de sélection pratique

| Type de tâche | Modèle recommandé | Pourquoi |
|---------------|-------------------|----------|
| Rédiger/réviser le PRD, décider d'une architecture | **Opus 4.6** | Trade-offs subtils, raisonnement long |
| Concevoir `messengerAdapter`, choisir un pattern | **Opus 4.6** | Architecture qui conditionne la suite |
| Debug d'un bug tenace (non reproductible, race condition) | **Opus 4.6** | Raisonnement en profondeur |
| Implémenter une feature claire d'après un plan | **Sonnet 4.6** | Vitesse + qualité suffisante |
| Code review, refactoring guidé | **Sonnet 4.6** | Défaut équilibré |
| Écrire des tests unitaires à partir d'une signature | **Sonnet 4.6** | Rapide, fiable |
| Générer des traductions (FR→AR/ES/PT/EN) | **Sonnet 4.6** ou **Haiku 4.5** | Tâche mécanique |
| Edits répétitifs : renommer, formatter, mettre à jour 20 fichiers | **Haiku 4.5** | Économie massive, qualité suffisante |
| Génération de microcopy / alt texts en masse | **Haiku 4.5** | Tâche simple et volumineuse |
| Commit messages, PR descriptions courts | **Haiku 4.5** | Bas enjeu |
| Scripts one-shot, conversion de formats | **Haiku 4.5** | Rapide |

### Utilisation côté **runtime** du bot (services/aiService.js)

Ne pas confondre le modèle qui **écrit le code** (Claude Code / cette CLI) avec le modèle que le **bot en prod** appelle via l'API Anthropic.

Pour le bot (réponses aux parents en WhatsApp/Telegram) :

| Tâche runtime | Modèle recommandé | Notes |
|---------------|-------------------|-------|
| Réponse coaching libre (Q&A, empathie, reformulation) | **Sonnet 4.6** | Équilibre qualité/latence/coût |
| Plan matinal structuré (ton clair, format fixe) | **Sonnet 4.6** (ou Haiku 4.5 si coût) | Tâche templatée |
| Bilan du soir / check-in 4 questions | **Haiku 4.5** | Format fixe, haut volume |
| Bilan hebdomadaire réflexif | **Sonnet 4.6** | Nuance, empathie |
| Detection de crise (suicide, maltraitance, urgence) | **Opus 4.6** | Ne JAMAIS risquer un faux négatif |
| Génération d'article blog (Phase 3) | **Opus 4.6** en brouillon + **Sonnet 4.6** en édition | Qualité éditoriale |
| Agents writer/editor/visual (Phase 4) | **Sonnet 4.6** | Pipelinés, volume |

**Prompt caching (skill `claude-api`)** : activer systématiquement sur les prompts système volumineux (`agents/SOUL.md` + `IDENTITY.md` + knowledge) — économie ~90% à partir du 2e appel.

**Fallback NVIDIA NIM (Mistral Large) :** garder en plan B gratuit si quota Anthropic serré pendant les tests.

---

## 0. Skills transverses (à utiliser quasi-systématiquement)

Ces skills devraient être invoqués **à chaque phase**, pas une fois pour toutes.

| Skill | Quand | Pourquoi |
|-------|-------|----------|
| `superpowers-overview` | Au démarrage de toute tâche | Charge les patterns de travail |
| `superpowers-brainstorming` | Avant d'écrire du code | Explore options et trade-offs plutôt que foncer |
| `superpowers-writing-plans` | Quand la tâche est non triviale | Produit un plan avant d'implémenter (cohérent avec nos `tasks/todo.md`) |
| `superpowers-tdd` | Pendant l'implémentation | TDD discipliné |
| `superpowers-verification` | Avant de marquer "terminé" | Vérifier que ça marche vraiment — cohérent avec la règle "preuve que ça fonctionne" du CLAUDE.md |
| `superpowers-systematic-debugging` | Quand un bug résiste | Méthode plutôt que retry aveugle |
| `superpowers-requesting-code-review` | Juste avant merge | Auto-review rigoureuse |
| `superpowers-finishing-branch` | Après merge | Propre fin de branche |
| `simplify` | Après toute PR | Révise pour réutilisation/qualité/efficacité |
| `open-pr` | Fin de feature | Ouvre PR avec description propre |
| `multi-ai-code-review` | Phases critiques | Revue multi-perspective |
| `feature-dev:feature-dev` | Toute nouvelle feature | Pipeline guidé brainstorm → blueprint → impl |

---

## 1. Phase 1 — Bot Telegram

**Objectif :** parité WhatsApp↔Telegram, 100% réutilisation backend.

| Skill | Rôle dans la phase |
|-------|-------------------|
| `claude-api` | Structurer l'usage de l'API Anthropic (prompt caching sur les prompts système) — applicable dès maintenant au bot WhatsApp aussi |
| `feature-dev:code-explorer` | Cartographier `handlers/`, `services/` avant de toucher |
| `feature-dev:code-architect` | Designer `messengerAdapter.js` |
| `superpowers-tdd` | Tester l'adapter avec des mocks Twilio/Meta/Telegram |
| `feature-dev:code-reviewer` | Revue avant merge |

**Livrables skill-assistés :**
- Plan de refacto `whatsappService` → `messengerAdapter` (skill: `writing-plans`)
- Blueprint adapter + interface commune (skill: `code-architect`)
- Tests de l'adapter (skill: `tdd` + `write-frontend-tests` pour le webhook)

---

## 2. Phase 2 — Webapp parent

**Objectif :** dashboard Astro + îlot React avec auth OTP.

| Skill | Rôle |
|-------|------|
| `frontend-design` | Design distinctif, pas un template générique |
| `ui-ux-pro-max` | Design intelligence end-to-end (flows login, dashboard) |
| `ux-designer` | Flows utilisateurs, states vides |
| `frontend-patterns` | Patterns React/Astro courants |
| `fullstack-velocity` | Full-stack rapide |
| `write-frontend-tests` | Tests composants et e2e |
| `microcopy` | Boutons, états, erreurs (les microcopies comptent) |
| `accessibility` | A11y dès le départ |
| `data:build-dashboard` | Dashboard HTML interactif (alternative si webapp trop lourde) |
| `data:create-viz` | Visualiser le profil, l'historique, les crons |

**Livrables skill-assistés :**
- Design system tokens (skill: `frontend-design`)
- Composants React dashboard (skill: `frontend-patterns`)
- Flow OTP (skill: `ux-designer`)
- Microcopies FR/EN/ES/PT/AR (skill: `microcopy`)
- Tests e2e login (skill: `write-frontend-tests`)

---

## 3. Phase 3 — Blog CMS + génération d'articles IA

**Objectif :** pipeline de publication durable ≥2 articles/semaine.

| Skill | Rôle |
|-------|------|
| `seo` | Audit + plan SEO global du blog |
| `seo-review` | Review SEO article par article |
| `blog-planner` | Planifier les sujets (calendrier éditorial) |
| `blog-writing-guide` | Enforcer les règles SEO/EEAT |
| `blog-draft` | Rédiger les drafts |
| `eeat-content-quality-audit` | Audit EEAT (Expertise/Authority/Trust) |
| `faq-generator` | Générer FAQ pour chaque article |
| `technical-writer` | Structure claire, pédagogique |
| `humanizer` | Retirer les signes "IA" |
| `editor` | Édition professionnelle finale |
| `brand-voice` | Voix éditoriale ParentEase cohérente |

**Livrables skill-assistés :**
- Calendrier éditorial 3 mois (skill: `blog-planner`)
- Template de prompt article (skill: `blog-writing-guide`)
- Checklist EEAT (skill: `eeat-content-quality-audit`)
- Script `scripts/generate-article.js` (skill: `claude-api` pour prompt caching)
- Voix éditoriale (skill: `brand-voice`)

---

## 4. Phase 4 — Moteur de contenu social

**Objectif :** de 1 article blog → posts multi-plateformes + 1 vidéo/semaine.

| Skill | Rôle |
|-------|------|
| `content-engine` | Contenus plateform-natives |
| `content-creator` | Contenu engageant |
| `content-writer` | Copy marketing |
| `anthropic-skills:content-design` | Content design produit |
| `image-generation` / `generate-image` | Génération visuels (wrapper pour Fal.ai/DALL-E) |
| `canvas-design` | Visuels carrousels IG |
| `infographic-creator` | Infographies à partir des articles |
| `infographic-outline-creator` | Plans d'infographies |
| `frontend-slides` | Slides animées (base Remotion) |
| `slack-gif-creator` | Création GIFs (réutilisable) |
| `algorithmic-art` | Visuels art algorithmique |
| `claude-api` | Prompt caching pour les prompts agents |
| `mcp-builder` | Si on veut exposer Postiz/Fal.ai comme MCP à Claude Code |

**Livrables skill-assistés :**
- Pipeline agents writer/editor/visual (skill: `claude-api` + Claude Agent SDK)
- 1 template Remotion Short (skill: `frontend-slides`)
- 6 templates carrousels IG (skill: `canvas-design`)
- Prompts Flux pour chaque format (skill: `image-generation`)
- Calibrage tone-of-voice par plateforme (skill: `brand-voice`)

---

## 5. Phase 5 — Scale & monétisation

| Skill | Rôle |
|-------|------|
| `data:analyze` | Analyser engagement, rétention |
| `data:statistical-analysis` | Stats sur cohortes |
| `data:build-dashboard` | Dashboard interne métriques |
| `data:explore-data` | Explorer les logs Langfuse |
| `data:sql-queries` | Requêtes sur `parenting_coach.db` |
| `investor-outreach` | Si levée de fonds |
| `market-sizing-analysis` | Sizing TAM/SAM/SOM |
| `competitive-landscape` | Paysage concurrentiel |
| `sales-enablement` | Collatéral B2B (écoles, mutuelles) |

---

## 6. Skills à activer dans la config projet

Créer `.claude/skills.json` ou pointer vers les skills anthropic-skills installés côté Claude Code.

Les skills préfixés `anthropic-skills:` sont déjà disponibles globalement via le système. Les skills projet spécifiques (`feature-dev:*`, `data:*`, `cowork-plugin-management:*`) sont aussi disponibles.

**Skills prioritaires à maîtriser :**
1. `claude-api` — parce que **tout notre backend appelle Claude**, le prompt caching économise 90% des coûts sur les prompts système volumineux (`agents/SOUL.md` + `IDENTITY.md` + base de connaissances)
2. `superpowers-*` — discipline de travail globale
3. `blog-writing-guide` + `seo` — cœur de la stratégie acquisition
4. `claude-api` (bis) — Claude Agent SDK pour Phase 4

---

## 7. Comment invoquer un skill

**Dans le chat :**
```
/blog-writing-guide
/seo
/frontend-design
```

**En instruction à Claude :**
> « Utilise le skill `claude-api` pour reviewer la façon dont `services/aiService.js` appelle Claude et ajouter le prompt caching sur le prompt système. »

**Skills qui veulent un contexte :**
- `feature-dev:code-explorer` → donner le chemin du module à cartographier
- `data:analyze` → donner la table/le fichier à analyser
- `seo-review` → donner l'URL ou le fichier `.md`

---

*Mise à jour : 2026-04-14 — à réviser à chaque fin de phase.*
