# ParentEase Landing Page Redesign — Design Spec
Date: 2026-04-13

## 1. Brand Identity
- **Name**: ParentEase (was NurtureCoach → Nour)
- **Tagline**: "Le coaching parental, simplifié."
- **Remove**: All Arabic `نور` text (nav logo, testimonials)
- **Colors** (keep existing palette):
  - Primary: `#0F4C81`
  - Teal: `#0D9488`
  - Accent: `#F59E0B`
  - Background: `#FAFBFF`

## 2. Design Principles (from design inspirations)
- Clean minimal layout — strong whitespace, clear hierarchy
- Professional but warm — NOT dark/terminal
- Real SVG icons from Lucide — NO emojis anywhere in UI
- Bold typography for headlines, clean body text
- Cards with subtle shadow + border, rounded corners

## 3. Icon Replacements (Lucide SVG)
Replace ALL emojis in UI with inline SVG icons:
- 🌅 → sun icon
- 🌙 → moon icon
- 🧠 → cpu/brain icon
- 🌍 → globe icon
- 🎤 → mic icon
- 👶 → users icon
- 😤 → zap icon (pain points)
- 😶 → message-square-off icon
- 😔 → heart icon
- 💡 → lightbulb icon
- ★ → star icon (filled)
- ✨ → sparkles (remove from text, use clean text)
- Checkmarks → check-circle icon

## 4. Blog Writer Attribution
| Article | Writer | Email |
|---------|--------|-------|
| crises-colere-enfant | Dr. Amara Diallo | dr.amara.diallo@gmail.com |
| attachement-secure-bebe | Dr. Amara Diallo | dr.amara.diallo@gmail.com |
| communication-parents-adolescents | Dr. Amara Diallo | dr.amara.diallo@gmail.com |
| style-parental-autoritatif | Thomas Girard | girardthomas980@gmail.com |
| ecrans-enfants-developpement | Thomas Girard | girardthomas980@gmail.com |
| sommeil-enfant-developpement | Thomas Girard | girardthomas980@gmail.com |

Initials: AD (Amara Diallo), TG (Thomas Girard)
Avatar gradient: AD = #0F4C81→#1B6CA8, TG = #0D9488→#0891B2

## 5. FAQ Revamp
New FAQ — 8 questions, organized thematically:

1. **Qu'est-ce que ParentEase exactement ?**
   ParentEase est un coach parental propulsé par une IA avancée, accessible sur WhatsApp. Il envoie chaque matin un plan parental personnalisé selon l'âge de votre enfant, propose un bilan interactif chaque soir à 21h, et reste disponible 24h/24 pour répondre à toutes vos questions. Aucune application à installer.

2. **Comment fonctionne le plan du matin ?**
   Chaque matin à 8h, ParentEase vous envoie un message structuré comprenant : une intention parentale du jour, une activité adaptée à l'âge de votre enfant (5-10 minutes), une astuce de communication, et un micro-geste de connexion. Tout est calibré sur votre profil familial.

3. **ParentEase est-il gratuit ?**
   Oui, ParentEase est entièrement gratuit pendant la période de lancement. Toutes les fonctionnalités sont accessibles sans carte bancaire ni engagement. Une offre premium pourra être proposée ultérieurement pour les familles souhaitant des fonctionnalités avancées.

4. **Quelles langues sont supportées ?**
   ParentEase parle couramment 5 langues : français, arabe classique (فصحى), espagnol, portugais et anglais. Il détecte automatiquement la langue de votre message et répond dans la même langue. Vous pouvez changer de langue à tout moment.

5. **Mes données sont-elles protégées ?**
   Vos données ne sont jamais vendues ni partagées avec des tiers. Le profil de votre famille est utilisé uniquement pour personnaliser vos conseils. Vous pouvez demander la suppression de votre profil à tout moment en envoyant "SUPPRIMER" dans la conversation.

6. **ParentEase remplace-t-il un professionnel de santé ?**
   Non. ParentEase est un outil de coaching éducatif basé sur des recherches scientifiques validées. Il n'établit aucun diagnostic médical ou psychologique. Pour tout problème de santé mentale, troubles du développement ou situation de crise, consultez un professionnel de santé qualifié.

7. **Pour quels âges d'enfants est-il adapté ?**
   ParentEase accompagne les parents d'enfants de 0 à 18 ans, avec des conseils adaptés à chaque stade : nouveau-né, nourrisson, tout-petit, préscolaire, primaire, préado et adolescent. Votre profil peut inclure plusieurs enfants d'âges différents.

8. **Comment me désabonner ?**
   Pour arrêter de recevoir les messages de ParentEase, envoyez simplement "STOP" à tout moment dans la conversation WhatsApp. La désinscription est instantanée, sans formulaire ni délai de préavis.

## 6. Files to Change
### index.html
- Replace "NurtureCoach" → "ParentEase" (all text occurrences)
- Remove `<span class="font-arabic ...">نور</span>` from nav logo
- Remove Arabic نور from testimonials (lines ~812, ~827) — replace with cleaner text
- Replace all emoji characters with inline SVG icons
- Update FAQ to 8 new questions above
- Update stats: still 5 langues, 500+ parents, 24/7, 98%

### 6 Blog Articles
- Update writer/author name + email + initials + gradient in schema + cards
- Replace "NurtureCoach" → "ParentEase" in all titles, descriptions, CTAs
- Replace emojis in article CTAs and footers with SVG

### Bot files
- onboardingFlow.js welcome message: NurtureCoach → ParentEase
- chat.js system prompt: NurtureCoach → ParentEase
- SOUL.md: no changes needed (no name ref)
