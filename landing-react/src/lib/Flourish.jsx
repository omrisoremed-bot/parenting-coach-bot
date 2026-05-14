/**
 * Flourish.jsx — Hand-drawn SVG decorative elements.
 *
 * Inspired by theparentingpassport.com (small cat/bird/heart/flower around hero).
 * Stroke-only, currentColor for theming, organic asymmetric shapes — feel hand-made.
 */

export function Leaf({ className = 'w-6 h-6', stroke = 1.4 }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 27 C 8 18, 14 11, 27 6" />
      <path d="M27 6 C 22 10, 18 16, 16 22" />
      <path d="M15 19 C 17 17, 20 16, 23 16" />
      <path d="M14 14 C 17 14, 19 13, 22 11" />
    </svg>
  );
}

export function HeartSmall({ className = 'w-4 h-4', stroke = 1.6 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20 C 8 16, 3 12, 5 8 C 7 4, 11 6, 12 9 C 13 6, 17 4, 19 8 C 21 12, 16 16, 12 20 Z" />
    </svg>
  );
}

export function SmallStar({ className = 'w-4 h-4', stroke = 1.4 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 4 L 13.5 10 L 20 11 L 15 15 L 16.5 22 L 12 18 L 7.5 22 L 9 15 L 4 11 L 10.5 10 Z" />
    </svg>
  );
}

/** Hand-drawn arrow that loops — used to point at things organically */
export function CurlyArrow({ className = 'w-12 h-12', stroke = 1.6 }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 40 C 14 28, 28 18, 44 22 C 56 25, 56 38, 44 42" />
      <path d="M38 36 L 44 42 L 50 36" />
    </svg>
  );
}

/** Soft brushstroke underline — used under italic-accent words */
export function Brushstroke({ className = 'w-32 h-3', stroke = 3 }) {
  return (
    <svg viewBox="0 0 120 12" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M3 8 C 30 3, 60 7, 90 4 C 105 3, 115 5, 117 6" />
    </svg>
  );
}

/** Tiny flower bud — 3 petals, hand-drawn feel */
export function FlowerBud({ className = 'w-5 h-5', stroke = 1.4 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="8"  r="3" />
      <circle cx="7"  cy="14" r="3" />
      <circle cx="17" cy="14" r="3" />
      <path d="M12 17 L 12 21 M 10 20 L 12 21 L 14 20" />
    </svg>
  );
}

/** Diagonal bird (Parenting Passport flourish) */
export function Bird({ className = 'w-7 h-5', stroke = 1.4 }) {
  return (
    <svg viewBox="0 0 32 22" fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 16 C 6 10, 12 8, 16 11" />
      <path d="M16 11 C 20 8, 26 10, 30 6" />
    </svg>
  );
}
