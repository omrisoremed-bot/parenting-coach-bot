/**
 * Shared Framer Motion variants — editorial timing (slower, softer than v1).
 * Calm slow-living app → animations feel intentional, never twitchy.
 */

// Soft tween used for fade-up reveals
export const easeSoft = { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.8 };

// Spring for hover lifts / interactive feedback
export const springGentle = { type: 'spring', stiffness: 150, damping: 22, mass: 0.9 };

// Spring snappier for buttons
export const springSnap = { type: 'spring', stiffness: 380, damping: 26 };

// ─── Scroll-triggered fade-up ────────────────────────────
export const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: easeSoft,
};

// ─── Stagger container ───────────────────────────────────
export const staggerContainer = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: '-80px' },
  transition: { staggerChildren: 0.1, delayChildren: 0.05 },
};

export const staggerItem = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: easeSoft,
};

// ─── Card hover lift (subtle Z-only) ─────────────────────
export const cardHover = {
  whileHover: { y: -4, transition: springGentle },
  whileTap:   { y: -1, scale: 0.995 },
};

// ─── Chat bubble cascade (Hero) ──────────────────────────
export const chatBubble = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { delay, type: 'spring', stiffness: 200, damping: 20 },
});

// ─── Italic word reveal (hero "au creux") ────────────────
export const italicReveal = (delay = 0.6) => ({
  initial: { opacity: 0, y: 12, letterSpacing: '0em' },
  animate: { opacity: 1, y: 0, letterSpacing: '-0.025em' },
  transition: { delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] },
});

// ─── Sage-underline pen-stroke effect ────────────────────
export const drawLine = (delay = 0.4) => ({
  initial: { scaleX: 0 },
  animate: { scaleX: 1 },
  transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
});
