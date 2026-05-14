/**
 * Authors — 8 expert cards with elegant Newsreader-serif monograms.
 * 3D tilt on hover via Framer Motion useMotionValue + useTransform.
 *
 * Photo strategy : monogram initials (e.g. "AD" Amara Diallo) inside a
 * warm-gradient circle. Lighter & more dignified than emoji, and zero
 * external image dependency. Swap `avatar` prop with a real photo URL
 * when professional headshots are ready (PNG/WebP, 200x200 min).
 */
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from '../lib/motion';

const AUTHORS = [
  { initials: 'AD', flag: '🇨🇦', name: 'Dr. Amara Diallo',     role: 'Pédiatre',                   hub: 'CHU Sainte-Justine',   place: 'Montréal',    tone: 'warm' },
  { initials: 'IF', flag: '🇧🇷', name: 'Dr. Isabella Ferreira', role: 'Neuropsychologue',           hub: 'INSERM',               place: 'Paris',       tone: 'cool' },
  { initials: 'PN', flag: '🇮🇳', name: 'Priya Nair',            role: 'Coach parentale ICF',        hub: 'Penguin UK',           place: 'Londres',     tone: 'warm' },
  { initials: 'EL', flag: '🇸🇪', name: 'Emma Lindqvist',        role: 'Sage-femme · sommeil',      hub: 'Karolinska',           place: 'Stockholm',   tone: 'cool' },
  { initials: 'YT', flag: '🇯🇵', name: 'Dr. Yuki Tanaka',       role: 'Diététicienne pédiatrique', hub: 'ULB · EFSA',           place: 'Bruxelles',   tone: 'warm' },
  { initials: 'MJ', flag: '🇺🇸', name: 'Dr. Marcus Johnson',    role: 'Pédiatre · santé équité',   hub: 'Johns Hopkins · AAP',  place: 'Baltimore',   tone: 'cool' },
  { initials: 'SR', flag: '🇺🇸', name: 'Dr. Sofia Reyes',       role: 'Psy · attachement',         hub: 'CHLA · USC',           place: 'Los Angeles', tone: 'warm' },
  { initials: 'EB', flag: '🇨🇦', name: 'Étienne Bouchard',      role: 'Consultant sommeil Gold',    hub: 'BC Children\'s Hosp.', place: 'Vancouver',   tone: 'cool' },
];

// Two avatar palettes — alternated for visual rhythm
const PALETTES = {
  warm: 'linear-gradient(135deg, #E8DCC4 0%, #C2613E 100%)',
  cool: 'linear-gradient(135deg, #EDE7DA 0%, #7B8B6F 100%)',
};

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
                className="relative bg-cream-deep/40 border border-ink/8 rounded-2xl p-6
                           h-full shadow-card hover:shadow-card-hover transition-shadow">

                <div className="flex items-start justify-between mb-5">
                  {/* Monogram avatar with warm/cool gradient */}
                  <div className="relative w-14 h-14 rounded-full grid place-items-center
                                  font-display text-[1.1rem] font-medium text-ink
                                  shadow-inset-soft"
                       style={{ background: PALETTES[a.tone] }}>
                    <span style={{ color: a.tone === 'warm' ? '#FFF' : '#FFF', letterSpacing: '0.02em' }}>
                      {a.initials}
                    </span>
                    {/* Tiny flag dot */}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cream
                                     grid place-items-center text-[0.7rem] border border-ink/8 shadow-sm">
                      {a.flag}
                    </span>
                  </div>
                </div>

                <div className="kicker text-terracotta-deep mb-1.5">{a.role}</div>
                <div className="font-display text-[1.2rem] font-medium leading-tight mb-2">
                  {a.name}
                </div>
                <div className="text-ink-faded text-[0.82rem] leading-snug">
                  {a.hub} · {a.place}
                </div>

                {/* Reveal-on-hover read more link */}
                <motion.a
                  href="#"
                  initial={{ opacity: 0, x: -4 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="mt-4 inline-flex items-center gap-1 text-[0.8rem] text-terracotta-deep
                             cursor-pointer pointer-events-none"
                >
                  Lire son journal →
                </motion.a>
              </motion.article>
            </TiltCard>
          ))}
        </motion.div>

        <motion.div {...fadeUp} className="mt-12 text-center">
          <a href="#" className="font-display italic text-[1.1rem] text-ink-faded
                                 underline underline-offset-4 decoration-1 decoration-sage/50
                                 hover:text-terracotta-deep hover:decoration-terracotta transition-colors">
            voir les 10 expert·es →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 3D tilt wrapper (perspective + Framer Motion) ─────────
function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-60, 60], [6, -6]), { stiffness: 180, damping: 20 });
  const ry = useSpring(useTransform(x, [-60, 60], [-6, 6]), { stiffness: 180, damping: 20 });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top  - r.height / 2);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transformStyle: 'preserve-3d', perspective: 900, rotateX: rx, rotateY: ry }}
    >
      {children}
    </motion.div>
  );
}
