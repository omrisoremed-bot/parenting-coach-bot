import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from '../lib/motion';

const TESTIS = [
  {
    name: 'Aïcha B.',
    place: 'Casablanca · enfant 4 ans',
    text: 'Mon fils faisait des crises tous les soirs avant le bain. En 2 semaines de plans matinaux, on a un rituel qui fonctionne. Je n\'y croyais pas.',
  },
  {
    name: 'Marie L.',
    place: 'Lyon · 2 enfants (1 et 3 ans)',
    text: 'J\'avais essayé 3 livres et 2 podcasts. Le coach me parle directement de ma situation, à 22h, quand j\'en ai besoin. Plus jamais sans.',
  },
  {
    name: 'Karim R.',
    place: 'Bruxelles · enfant 6 ans',
    text: 'Le seul outil parental qui parle à un papa sans condescendance. Les jeux du dimanche ont sauvé mes weekends de garde.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Témoignages
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05]">
            Des parents qui<br />
            <span className="italic-accent">dorment</span> à nouveau.
          </h2>
        </motion.div>

        <motion.div {...staggerContainer} className="grid md:grid-cols-3 gap-10 lg:gap-14">
          {TESTIS.map((t, i) => (
            <motion.figure
              key={i}
              variants={staggerItem}
              className="border-t border-ink/15 pt-8"
            >
              <span className="font-display text-[4rem] italic-accent leading-none block -mb-4">
                "
              </span>
              <blockquote className="text-[1.05rem] text-ink leading-relaxed mb-6
                                     font-display font-medium" style={{ fontStyle: 'italic' }}>
                {t.text}
              </blockquote>
              <figcaption className="text-[0.85rem]">
                <div className="font-body font-medium text-ink">{t.name}</div>
                <div className="text-ink-faded mt-0.5">{t.place}</div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
