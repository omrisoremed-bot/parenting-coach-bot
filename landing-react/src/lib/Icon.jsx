/**
 * Inline SVG icons (Lucide-inspired, but bundled to avoid an extra dep).
 * Stroke-only, currentColor for theming, 24x24 viewBox.
 */
export function Icon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths}
    </svg>
  );
}

const ICONS = {
  arrow:    <path d="M5 12h14M13 5l7 7-7 7" />,
  check:    <path d="M5 13l4 4L19 7" />,
  whatsapp: <><path d="M3 21l1.65-4.95A9 9 0 1 1 8 19.74L3 21z"/><path d="M9 10s0 3 3 3 3-3 3-3"/></>,
  telegram: <><path d="M21 4L3 11l5 2 2 6 3-4 4 3 4-14z"/><path d="M8 13l8-7"/></>,
  shield:   <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />,
  globe:    <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  sparkle:  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />,
  heart:    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  star:     <path d="M12 2l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7z" />,
  game:     <><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h.01M16 12h.01M11 12h2"/></>,
  doctor:   <><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="12" cy="12" r="10"/></>,
  moon:     <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  pulse:    <path d="M3 12h4l3-8 4 16 3-8h4" />,
};
