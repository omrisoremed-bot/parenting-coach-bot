/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:        '#F5F1E8',   // primary background
        'cream-deep': '#EDE7DA',   // section alternation
        'cream-warm': '#F0E6D2',   // CTA backgrounds
        ink:          '#1A1A1A',   // primary text
        'ink-soft':   '#4A4A48',   // secondary text
        'ink-faded':  '#8A8378',   // muted, captions
        terracotta:   '#C2613E',   // primary accent (italic, CTAs)
        'terracotta-deep': '#A04E2F',
        sage:         '#7B8B6F',   // logo dot, micro accents
        'sage-deep':  '#5F6F55',
        wheat:        '#E8DCC4',   // tertiary
        carbon:       '#0E0E0C',   // extra-dark footer
      },
      fontFamily: {
        display: ['Newsreader', 'Times New Roman', 'serif'],
        body:    ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        'editorial': '-0.025em',
        'kicker':    '0.18em',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(26,26,26,.04), 0 8px 24px rgba(26,26,26,.06)',
        'card-hover': '0 4px 12px rgba(26,26,26,.06), 0 24px 48px rgba(26,26,26,.10)',
        'inset-soft': 'inset 0 1px 0 rgba(255,255,255,.6)',
      },
      borderRadius: {
        'pill': '999px',
      },
      animation: {
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'breathing':  'breathing 4s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        breathing: {
          '0%,100%': { opacity: 1 },
          '50%':     { opacity: 0.7 },
        },
      },
    },
  },
  plugins: [],
};
