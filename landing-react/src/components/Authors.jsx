/**
 * Authors — 8 expert cards with subtle 3D tilt on hover (cursor-tracking).
 * Uses Framer Motion useMotionValue + useTransform for CSS perspective transform.
 */
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from '../lib/motion';

const AUTHORS = [
  { flag: '🇨🇦', glyph: '🩺', name: 'Dr. Amara Diallo',     role: 'Pédiatre',                       hub: 'CHU Sainte-Justine',  place: 'Montréal' },
  { flag: '🇧🇷', glyph: '🧠', name: 'Dr. Isabella Ferreira', role: 'Neuropsychologue',               hub: 'INSERM',              place: 'Paris' },
  { flag: '🇮🇳', glyph: '🌱', name: 'Priya Nair',            role: 'Coach parentale ICF',            hub: 'Penguin UK',          place: 'Londres' },
  { flag: '🇸🇪', glyph: '🌙', name: 'Emma Lindqvist',        role: 'Sage-femme · sommeil',          hub: 'Karolinska',          place: 'Stockholm' },
  { flag: '🇯🇵', glyph: '🍃', name: 'Dr. Yuki Tanaka',       role: 'Diététicienne pédiatrique',     hub: 'ULB · EFSA',           place: 'Bruxelles' },
  { flag: '🇺🇸', glyph: '🩻', name: 'Dr. Marcus Johnson',    role: 'Pédiatre · santé équité',       hub: 'Johns Hopkins · AAP', place: 'Baltimore' },
  { flag: '🇺🇸', glyph: '💆', name: 'Dr. Sofia Reyes',       role: 'Psychologue · attachement',     hub: 'CHLA · USC',           place: 'Los Angeles' },
  { flag: '🇨🇦', glyph: '😴', name: 'Étienne Bouchard',      role: 'Consultant sommeil Gold',        hub: 'BC Children\'s Hosp.', place: 'Vancouver' },
];

export default function Authors() {
  return (
    <section id="stades" className="py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[760px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Nos voix
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05] mb-5">
            Dix <span className="italic-accent">voix</span> qui connaissent<br />
            tes nuits, tes midis, tes 16h.
          </h2>
          <p className="text-[1.05rem] text-ink-soft max-w-[58ch] leading-relaxed">
            Tous·tes en exercice. Publications peer-reviewed, profils vérifiables.
            Tu peux les lire dans le journal.
          </p>
        </motion.div>

        <motion.div {...staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AUTHORS.map((a, i) => (
            <TiltCard key={i}>
              <motion.article variants={staggerItem}
                className="relative bg-cream-deep/60 border border-ink/8 rounded-2xl p-6
                           h-full shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-full bg-cream-warm grid place-items-center
                                  text-[1.4rem] border border-ink/6">
                    {a.glyph}
                  </div>
                  <span className="text-[1rem]" title={a.place} aria-label={a.place}>{a.flag}</span>
                </div>
                <div className="kicker text-terracotta-deep mb-1">{a.role}</div>
                <div className="font-display text-[1.25rem] font-medium leading-tight mb-2">
                  {a.name}
                </div>
                <div className="text-ink-faded text-[0.82rem] leading-snug">
                  {a.hub} · {a.place}
                </div>
              </motion.article>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── 3D tilt wrapper (CSS perspective + useMotionValue) ─────
function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-50, 50], [6, -6]), { stiffness: 180, damping: 20 });
  const ry = useSpring(useTransform(x, [-50, 50], [-6, 6]), { stiffness: 180, damping: 20 });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top  - r.height / 2);
  }
  function onLeave() {
    x.set(0); y.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 900,
        rotateX: rx,
        rotateY: ry,
      }}
    >
      {children}
    </motion.div>
  );
}
