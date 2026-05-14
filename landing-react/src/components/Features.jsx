import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from '../lib/motion';

const FEATURES = [
  {
    title: 'Vrais expert·es, vraies citations',
    body: 'Chaque conseil est signé par un·e pédiatre, psychologue ou consultant·e sommeil. Les sources sont peer-reviewed (Bowlby, Baumrind, Piaget…).',
    kicker: '10 spécialistes',
  },
  {
    title: 'Multiculturel par design',
    body: 'Familles immigrantes, traditions diverses, valeurs religieuses, contextes culturels. Le bot s\'adapte, ne juge jamais.',
    kicker: '5 langues',
  },
  {
    title: '60 jeux parent-enfant',
    body: 'Tu écris « jeu », on te propose une activité 5–15 min selon l\'âge, le lieu et ton énergie du moment.',
    kicker: 'À la demande',
  },
  {
    title: 'RGPD-natif, jamais revendu',
    body: 'Données hébergées en Europe. Stop ou suppression en 1 message. Zéro publicité, zéro tracking.',
    kicker: 'Privé par défaut',
  },
];

export default function Features() {
  return (
    <section id="rythme" className="bg-cream-deep py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Pourquoi ici
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05] mb-5">
            Quatre <span className="italic-accent">choses</span><br />
            que personne d'autre ne fait.
          </h2>
        </motion.div>

        <motion.div {...staggerContainer} className="grid sm:grid-cols-2 gap-x-12 gap-y-14">
          {FEATURES.map((f, i) => (
            <motion.article
              key={i}
              variants={staggerItem}
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="cursor-default border-t border-ink/10 pt-8"
            >
              <div className="kicker text-terracotta-deep mb-3">{f.kicker}</div>
              <h3 className="text-[1.55rem] font-medium leading-tight mb-3">
                {f.title}
              </h3>
              <p className="text-ink-soft text-[0.98rem] leading-relaxed">{f.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
