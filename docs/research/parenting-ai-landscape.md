# État de l'art des coachs parentaux IA open source — et pistes pour donner une âme à ParentAtEase

*Rapport de recherche — mai 2026*

---

## 1. Résumé exécutif

ParentAtEase produit aujourd'hui des messages au format mécaniquement correct mais émotionnellement plats. La cause n'est pas le modèle (llama-3.3-70b est largement capable d'incarner un ton chaleureux) mais l'**architecture du prompt** : un `SOUL.md` long, descriptif, et une base de connaissances injectée brute, sans **un seul exemple de la voix attendue**. Les projets open source comparables (EmoLLM, SoulChat, ai-life-coach-langchain, Linell/coach) qui obtiennent une voix incarnée partagent trois patterns absents chez nous : (1) **few-shot examples** de réponses idéales dans le system prompt, (2) **étape de raisonnement empathique invisible** avant la sortie, et (3) **signature lexicale** (phrases-tics, vocabulaire culturel, micro-anecdotes). Ce rapport documente 13 projets pertinents, isole 6 patterns reproductibles, et propose 7 améliorations concrètes — toutes locales (édition de `SOUL.md`, `aiService.js`, `promptBuilder.js`) et sans dépendance nouvelle.

---

## 2. État de l'art — projets open source pertinents

### 2.1 Coachs parentaux et assistance famille

- **EmoLLM** — `github.com/SmartFlowAI/EmoLLM` (~2k+ étoiles, Apache-2.0, Python). LLM de santé mentale chinois multi-modèles (InternLM, Qwen, Llama). Inclut un pipeline RAG + dataset multi-tours `CPsyCounD`. Intérêt pour nous : leur méthodologie d'évaluation **empathie / écoute / orientation** est explicite et codifiée comme rubrique — pas comme prose descriptive.
- **SoulChat (BaiChuan / SCUT)** — `github.com/scutcyr/SoulChat`. Modèle empathique entraîné sur 2 M conversations annotées sur 12 thèmes émotionnels. Le `SoulChatCorpus` montre que **la reconnaissance d'émotion + reformulation systématique** est apprise par exemples, pas par règles.
- **Mental Health Chatbot (Rogendo)** — `github.com/Rogendo/Mental-health-Chatbot`. Bot multilingue minimaliste sur Llama-2. Code lisible, prompt court, mais riche en exemples de tours.
- **AI Chatbot for Parents of Autistic Children** (Google Generative AI demo). Plus petit, mais bonne illustration de **personnalisation par profil enfant** injectée en début de chaque tour.
- **Virtual Parenting Avatar AI** — projet académique pour orphelins, exemplaire pour le ton « figure parentale » (chaleureux, rassurant, jamais conseilleur).

### 2.2 Coachs de vie / habitudes (forte personnalité)

- **anujanand6/ai-life-coach-langchain** (Wisemind AI) — LangChain + GPT-4 + Streamlit. **Personnages prédéfinis** : Rocky (coach fitness), Emma (coach relations). Chaque coach = un `PromptTemplate` séparé avec **biographie courte + 2-3 tours d'exemple**. C'est précisément ce qui manque chez nous.
- **Linell/coach** — `github.com/Linell/coach`. AI life coach servi via MCP, local-first. Démontre une boucle « **état utilisateur → micro-prompt structuré** » plutôt qu'un méga-system-prompt.
- **sepehrfard/life_coach** — Assistant vocal GPT-4. Court, mais montre comment **mémoire de la journée** est injectée en récit narratif, pas en JSON.

### 2.3 Frameworks de génération structurée et empathique

- **DSPy** (Stanford / DataBricks) — `github.com/stanfordnlp/dspy`. Pattern `Signature` = contrat explicite input/output. Pour nous, l'idée transposable : remplacer le prompt monolithique par des **signatures** (`MorningPlan(profile, mood) -> focus, activity, communication_tip, micro_gesture`) avec des champs typés et **un exemple par champ**.
- **Guidance** (Microsoft) — `github.com/guidance-ai/guidance`. Permet d'imposer un format de sortie tout en laissant le modèle « parler librement » entre les balises. Pertinent pour passer d'un template rigide à un template à **respiration**.
- **Instructor** — `github.com/jxnl/instructor`. Validation Pydantic des sorties LLM. Utile si on veut un champ `emotion_acknowledged` explicite avant les conseils.
- **LangChain `ChatPromptTemplate` + `FewShotPromptTemplate`** — `python.langchain.com/docs/modules/model_io/prompts/few_shot_examples`. La référence pour injecter 2-5 exemples de tours dans le system prompt.

### 2.4 Collections de prompts persona

- **f/awesome-chatgpt-prompts** (alias `prompts.chat`, ~143k étoiles) — `github.com/f/awesome-chatgpt-prompts`. Contient des prompts « therapist », « life coach », « mentor ». Le pattern commun gagnant : **2-3 phrases qui décrivent ce que le coach FAIT en réponse, suivies d'une amorce de ton en première personne** (« I will start by asking… »).
- **elder-plinius/CL4R1T4S** et **jujumilk3/leaked-system-prompts** — collections de prompts système leakés (Pi, Character.ai, Claude). Lecture instructive : les personas qui « fonctionnent » commercialement (Pi notamment) ont des prompts **courts** (~200-400 mots), centrés sur la **manière de répondre**, pas sur des frameworks théoriques. Pi : « Be warm, be specific, be a friend who listens first ».

---

## 3. Patterns de prompt engineering qui produisent une voix incarnée

### 3.1 Few-shot dialogiques dans le system prompt

Le pattern le plus consistant dans les projets qui « ont une âme » : **inclure 2 à 4 mini-dialogues complets** (entrée utilisateur → sortie idéale) directement dans le system prompt. Le modèle imite ce qu'il voit beaucoup mieux que ce qu'on lui décrit. Wisemind AI le fait pour chacun de ses coachs, SoulChat le fait via fine-tuning, awesome-chatgpt-prompts le fait via la formulation « start by saying X ».

### 3.2 Étape de raisonnement empathique masquée

Pattern issu de papiers récents (« Cause-Aware Empathetic Response Generation via Chain-of-Thought Fine-Tuning », 2024) : avant la sortie visible, le modèle produit un bloc **`<reflection>…</reflection>`** où il identifie l'émotion probable du parent, la cause sous-jacente, et l'angle de réponse — puis génère la réponse finale. Le bloc reflection est ensuite **strippé côté serveur**. Effet observé : sortie nettement plus attunée, sans coût latence majeur (50-100 tokens en plus).

### 3.3 Signature lexicale et tics personnels

Les personas mémorables ont des **micro-marqueurs** : Pi termine souvent par une question ouverte ; Replika utilise des hedges (« I think… », « It sounds like… ») ; les coachs Discipline Positive parlent toujours en « observation → hypothèse → invitation » ('Je vois que… peut-être que… que dirais-tu de…'). Le SOUL actuel le dit en théorie (« valider → rediriger → enseigner ») mais ne le **montre** jamais.

### 3.4 Connaissance digérée en principes, pas en pavés

EmoLLM et SoulChat n'injectent pas leurs sources brutes ; ils les **distillent en 5-10 principes courts** que le modèle peut réellement utiliser dans une réponse de 160 mots. Notre `loadKnowledgeBase()` injecte 20 000 caractères de prose académique : le modèle paie ce contexte en attention mais ne sait pas le **convertir** en une phrase de coach.

### 3.5 Ouverture émotionnelle obligatoire

Les meilleurs bots imposent une **première phrase qui nomme l'émotion** avant tout conseil. SoulChat formalise cela (« Empathic Listening → Reflective Reformulation → Guidance »). Notre prompt conversation dit « reformule la problématique » mais accepte une reformulation cognitive ; pas de contrainte affective.

### 3.6 Persona instanciée par le contexte (pas par adjectifs)

Les leaks de Pi/Character.ai montrent que les system prompts efficaces utilisent **des verbes d'action en 1ère personne** (« I notice », « I ask », « I never lecture ») plutôt que des adjectifs (« chaleureux », « ancré »). Les adjectifs ne dirigent pas la génération ; les comportements oui.

---

## 4. Diagnostic — pourquoi nos sorties manquent d'âme

### 4.1 Aucun exemple de la voix attendue (cause principale)

`agents/SOUL.md` fait 164 lignes et décrit la personnalité (« Chaleureux mais ancré… ») et les frameworks (Nelsen, Gottman, Tsabary, etc.) — mais **ne contient pas un seul exemple de message** au ton souhaité. Le modèle voit la grille de format (lignes 77-117) mais doit **inventer la voix** seul → il régresse vers le ton « LLM neutre » qui sonne « nul, pas d'âme ».

### 4.2 Format rigide en quatre champs

Le format `FOCUS / ACTIVITÉ / ASTUCE / RAPPEL` (SOUL.md lignes 81-92) force le modèle à remplir 4 slots de longueur prédictible. C'est exactement la structure qui produit des sorties qui « cochent les cases sans empathie ». Comparer avec le bilan du soir (lignes 100-104) : seulement 4 questions ouvertes → produit mécaniquement quelque chose de plus humain car le modèle n'a pas à *expliquer* en 8 mots.

### 4.3 Base de connaissances inerte

`services/aiService.js` lignes 24-44 : on concatène 8 fichiers `.md` (`discipline-positive.md`, `communication-nonviolente.md`, etc.) en prose, tronqués à 20K chars. Le contenu est excellent en lecture humaine, mais le modèle ne sait pas le **transformer en une astuce de 12 mots**. Il consomme le contexte sans s'en servir activement.

### 4.4 Pas de raisonnement préalable

`callAI()` (aiService.js lignes 141-218) appelle directement le LLM avec system+user. Aucun champ caché type `<reflection>` n'est demandé. Le modèle saute l'attunement émotionnel et passe direct à la production de format.

### 4.5 Prompts builders pauvres en signal affectif

`buildMorningPrompt` (lignes 225-236) injecte le profil en JSON brut. Le JSON tue le ton — le modèle voit `{"name":"Sophie"}` au lieu de « Sophie, maman de Lina (3 ans), en télétravail, sommeil perturbé cette semaine ». `buildConversationPrompt` (lignes 290-315) numérote 4 instructions sèches : c'est précisément ce qui pousse le modèle à produire 4 paragraphes secs.

### 4.6 Persona décrite par adjectifs, pas par comportements

SOUL.md ligne 8 : « Chaleureux mais ancré. Jamais moralisateur. » Aucun verbe d'action concret. Comparer à un prompt Pi-style : « Je commence toujours par nommer ce que je perçois. Je propose, je n'impose pas. Je termine par une question qui ouvre. »

### 4.7 Cold open : pas d'ancrage temporel ni personnel

Le message du matin commence par `[COACH] — [Jour] [Date]` (SOUL.md ligne 79). Aucune référence au prénom du parent, à l'enfant, au contexte de la veille. C'est un *broadcast*, pas une conversation. L'âme naît de la spécificité.

---

## 5. Propositions concrètes (du plus impactant au plus léger)

### Proposition 1 — Injecter 3 exemples « gold » dans SOUL.md (impact maximal)

**Quoi** : ajouter à la fin de `agents/SOUL.md` une section `## EXEMPLES DE TON` contenant 3 mini-dialogues : (a) un plan du matin idéal pour une maman seule avec un enfant de 4 ans en pleine phase "non", (b) un check-in du soir tendre après une journée dure, (c) une réponse libre à un message de détresse de 22h.
**Pourquoi** : c'est le levier #1 documenté dans tous les projets à voix incarnée (Wisemind, Pi, SoulChat). Le modèle imite ce qu'il voit. Coût : ~600 mots dans le system prompt, largement sous notre budget de 20K chars.
**Fichier** : `agents/SOUL.md`.

### Proposition 2 — Ajouter une étape `<reflection>` masquée dans `buildMorningPrompt` et `buildConversationPrompt`

**Quoi** : demander au modèle de produire d'abord un bloc `<reflection>…</reflection>` (3-4 lignes : émotion perçue, cause probable, angle de réponse) puis la réponse visible. Stripper le bloc côté serveur via une regex simple dans `callAI()`.
**Pourquoi** : pattern « CoT empathique » documenté dans la littérature 2024-2025. Améliore l'attunement sans alourdir le message final. Coût : +80-120 tokens par appel.
**Fichiers** : `services/aiService.js` (ajouter post-traitement après `response.choices[0].message.content`), `agents/SOUL.md` (décrire la convention).

### Proposition 3 — Remplacer le JSON brut du profil par une phrase narrative

**Quoi** : créer un helper `narrateProfile(user)` qui transforme le profil en 1-2 phrases : « Sophie, maman solo de Lina (3 ans, tempérament intense). Défi actuel : crises au coucher. Valeurs : douceur, cadre ferme. »
**Pourquoi** : le LLM lit la prose mille fois mieux que le JSON. La prose porte le ton à transposer.
**Fichier** : `services/aiService.js` — refactor commun à `buildMorningPrompt`, `buildEveningPrompt`, `buildWeeklyPrompt`, `buildConversationPrompt`.

### Proposition 4 — Distiller la base de connaissances en `principles.md` court

**Quoi** : créer `knowledge/_principles.md` (≤ 3000 chars) — 30 à 50 principes actionnables en une ligne chacun (« Nommer l'émotion avant la consigne », « Préférer 'je vois que' à 'tu es' », « Réparation > punition »…). Le `loadKnowledgeBase()` charge **ce fichier en premier** et les autres seulement si budget restant.
**Pourquoi** : le modèle utilise des principes courts, pas des chapitres. Garde la richesse pour les scripts de génération d'articles via `npm run knowledge:build` (déjà séparés).
**Fichiers** : nouveau `knowledge/_principles.md`, modifier l'ordre de tri dans `services/aiService.js` ligne 30.

### Proposition 5 — Assouplir le format du matin (champ « note de coach »)

**Quoi** : ajouter dans SOUL.md (format matin) un 5ᵉ champ libre `*UN MOT POUR TOI :*` placé en tête, 1-2 phrases personnelles référant au prénom du parent, à l'enfant, ou à la veille. Conserver les 4 champs structurés ensuite.
**Pourquoi** : c'est ce champ qui porte l'âme. Les 4 autres restent fonctionnels.
**Fichier** : `agents/SOUL.md` lignes 77-92.

### Proposition 6 — Réécrire la personnalité en verbes d'action (1ère personne)

**Quoi** : remplacer SOUL.md lignes 7-15 par une liste de 8-12 comportements en « je » : « Je commence par nommer ce que tu vis. Je ne donne jamais plus de 3 conseils. Je termine par une question qui ouvre, pas qui ferme. Je n'utilise jamais 'il faut'. J'écris comme un ami qui connaît le métier. »
**Pourquoi** : les leaks Pi/Character.ai montrent que c'est cette forme qui dirige réellement la génération.
**Fichier** : `agents/SOUL.md`.

### Proposition 7 — Injecter un « anti-pattern » explicite

**Quoi** : ajouter dans SOUL.md une section `## CE QUE TU N'ÉCRIS JAMAIS` avec 5-8 exemples concrets de phrases interdites : « N'écris jamais 'C'est tout à fait normal' (creux). N'écris jamais 'En tant que coach…' (méta). N'écris jamais 'Il est important de…' (sermonneur). »
**Pourquoi** : nommer les pièges précis est plus efficace que des règles abstraites. Pattern utilisé dans plusieurs prompts leakés.
**Fichier** : `agents/SOUL.md` (compléter la section lignes 156-163).

---

## 6. Sources et liens

### Projets GitHub référencés
- EmoLLM — https://github.com/SmartFlowAI/EmoLLM
- SoulChat — https://github.com/scutcyr/SoulChat (paper: https://aclanthology.org/2023.findings-emnlp.83/)
- Rogendo/Mental-health-Chatbot — https://github.com/Rogendo/Mental-health-Chatbot
- Say2hub/Mental_Health_Chatbot — https://github.com/Say2hub/Mental_Health_Chatbot
- anujanand6/ai-life-coach-langchain — https://github.com/anujanand6/ai-life-coach-langchain
- Linell/coach — https://github.com/Linell/coach
- sepehrfard/life_coach — https://github.com/sepehrfard/life_coach
- Sahandfer/EMPaper (revue papiers empathie conversationnelle) — https://github.com/Sahandfer/EMPaper
- f/awesome-chatgpt-prompts — https://github.com/f/awesome-chatgpt-prompts
- elder-plinius/CL4R1T4S (prompts leakés) — https://github.com/elder-plinius/CL4R1T4S
- jujumilk3/leaked-system-prompts — https://github.com/jujumilk3/leaked-system-prompts
- NEU-DataMining/awesome-affective-computing — https://github.com/NEU-DataMining/awesome-affective-computing
- DSPy — https://github.com/stanfordnlp/dspy
- Guidance — https://github.com/guidance-ai/guidance
- Instructor — https://github.com/jxnl/instructor

### Articles et papiers
- « Cause-Aware Empathetic Response Generation via Chain-of-Thought Fine-Tuning » (arXiv 2408.11599) — https://arxiv.org/abs/2408.11599
- « Building Emotional Support Chatbots in the Era of LLMs » (arXiv 2308.11584) — https://arxiv.org/abs/2308.11584
- « What makes Inflection's Pi a great companion chatbot » (Medium, Lindsey Liu) — https://medium.com/@lindseyliu/what-makes-inflections-pi-a-great-companion-chatbot-8a8bd93dbc43
- « LLM Personas: How System Prompts Influence Style, Tone, and Intent » (Brim Labs) — https://brimlabs.ai/blog/llm-personas-how-system-prompts-influence-style-tone-and-intent/
- « Role Prompting » (Learn Prompting) — https://learnprompting.org/docs/advanced/zero_shot/role_prompting
- « On Persona Prompting » (stunspot / Medium) — https://medium.com/@stunspot/on-persona-prompting-8c37e8b2f58c
- LangChain Few-Shot Templates — https://python.langchain.com/docs/modules/model_io/prompts/few_shot_examples
