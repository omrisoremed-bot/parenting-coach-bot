# ParentAtEase Landing — React + Vite + Framer Motion

Refonte complète de la landing page (anciennement `parentflow-ai.netlify.app`).

## 🎯 Architecture

- **Vite 5** — bundler / dev server
- **React 18** — UI runtime
- **Tailwind CSS 3** — utilities + custom theme (palette + fonts dans `tailwind.config.js`)
- **Framer Motion 11** — animations spring, scroll-triggered, hover lift, chat sequence
- **0 router** — page unique avec anchors smooth-scroll
- **Le blog est ISOLÉ** — il sera déployé sur `blog.parentatease.com` (sous-domaine séparé)

## 📁 Structure

```
landing-react/
├── index.html              # entry HTML (Google Fonts preconnect, JSON-LD)
├── package.json
├── vite.config.js          # Vite config + manual chunks (react / motion)
├── tailwind.config.js      # design tokens
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx             # section assembly
    ├── index.css           # Tailwind directives + base + reduced-motion
    ├── lib/
    │   ├── motion.js       # shared variants (fadeUp, stagger, cardHover, chatBubble)
    │   └── Icon.jsx        # inline SVG icons (Lucide-inspired)
    └── components/
        ├── Nav.jsx         # sticky, glass backdrop, brand-icon emoji rotation
        ├── Hero.jsx        # H1 marker + 3 chat cards staggered + parallax blobs
        ├── Ticker.jsx      # infinite logo scroll (CHU, Hopkins, INSERM, OMS…)
        ├── HowItWorks.jsx  # 3 numbered steps with hover lift
        ├── Features.jsx    # 4 rotated colorful cards (white section + wavy dividers)
        ├── Authors.jsx     # 8-expert grid with rotation
        ├── Games.jsx       # dark ink section, 4 game preview cards
        ├── Testimonials.jsx# 3 speech-bubble cards (sun / coral / sky)
        ├── Pricing.jsx     # 2 paid tiers (NO free plan), trial 7 days
        ├── FAQ.jsx         # accordion with AnimatePresence
        ├── CTA.jsx         # rainbow gradient banner
        └── Footer.jsx      # ink bg, 4 columns, blog link → external subdomain
```

## 🚀 Setup

```bash
cd landing-react
npm install
npm run dev      # → http://localhost:5173
```

## 🏗 Build

```bash
npm run build    # → outputs to landing-react/dist/
npm run preview  # → preview build at http://localhost:4173
```

## 🌐 Deploy on Netlify

This project is deployed via the repo's root `netlify.toml`:

```toml
[build]
  base    = "landing-react"
  command = "npm install && npm run build"
  publish = "landing-react/dist"
```

Push to `main` → Netlify rebuilds automatically.

### Sub-domain split
- `parentatease.com` / `parentatease.netlify.app` → this landing (React)
- `blog.parentatease.com` → static blog (separate Netlify site, separate `landing/blog/` build)

## 🎨 Design tokens

Centralized in `tailwind.config.js` (CSS class form for utility) :

| Token | Value |
|-------|-------|
| `bg-sun`   | `#FFC93C` |
| `bg-coral` | `#FF6B9D` |
| `bg-sky`   | `#4ECDC4` |
| `bg-mint`  | `#95E1D3` |
| `bg-lav`   | `#B5A8FF` |
| `bg-cream` | `#FFFAEC` |
| `bg-ink`   | `#2D3047` |
| `font-display` | `Fredoka` |
| `font-body`    | `Nunito` |
| `font-hand`    | `Caveat` |
| `shadow-pop`   | `0 10px 0 #2D3047` |

## ♿ Accessibility

- WCAG AA contrast on all text (≥ 4.5:1 on cream backgrounds)
- `prefers-reduced-motion` respected (all animations short-circuited)
- Focus-visible outline (coral, 3px, offset 3px)
- Keyboard navigable nav + FAQ accordion (`aria-expanded`)
- Alt text on all decorative emojis marked `aria-hidden`

## 🧩 Animation strategy

| Trigger | Component | Pattern |
|---------|-----------|---------|
| Page load | Hero | Staggered children (badge → H1 → lede → CTAs → trust) |
| Chat cards | Hero | Sequential `chatBubble(delay)` from `lib/motion.js` (Aïcha 0.5s → bot 1.2s → Lina 2.0s) |
| Float | Hero chat cards | Tailwind `animate-float-{1,2,3}` (CSS keyframes) |
| Scroll | All sections | `fadeUp` via `whileInView` (viewport `once: true, margin: -80px`) |
| Grid items | Features, Authors, Games | `staggerContainer` + `staggerItem` (0.08s stagger) |
| Hover | All cards | `whileHover={{ y: -6 }}` spring |
| Accordion | FAQ | `AnimatePresence` height auto-spring + rotate `+` icon |

## 📜 Naming history

`Parenting Coach` → `Nour` → `NurtureCoach` → `ParentEase` → **`ParentAtEase`** (since 2026-05-10 — `parentease.app` & `parentease.ca` belong to competitors).
