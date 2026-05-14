import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, cardHover } from '../lib/motion';

const STEPS = [
  {
    n: '01',
    title: 'Tu écris « Bonjour »',
    body: 'Sur WhatsApp ou Telegram. On te pose 3 questions courtes : l\'âge de ton enfant, ce qui te pèse en ce moment, et la langue dans laquelle tu veux qu\'on se parle.',
  },
  {
    n: '02',
    title: 'Tu reçois ton plan du matin',
    body: 'À 8h, un message court : focus du jour, activité 5 min, astuce communication. Adapté à TON enfant, pas à une moyenne statistique.',
  },
  {
    n: '03',
    title: 'Tu poses tes questions',
    body: 'Crise à 22h ? Refus de manger à midi ? Tu écris, on répond en moins de 6 secondes — avec la voix de l\'un·e de nos 10 spécialistes.',
  },
];

export default function HowItWorks() {
  return (
    <section id="comment" className="py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Comment ça marche
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05] mb-5">
            Trois étapes,<br />
            <span className="italic-accent">deux minutes</span> en tout.
          </h2>
          <p className="text-[1.05rem] text-ink-soft max-w-[58ch] leading-relaxed">
            Pas de compte à créer. Pas d'application à télécharger.
            On te répond là où tu es déjà.
          </p>
        </motion.div>

        <motion.div {...staggerContainer} className="grid md:grid-cols-3 gap-10 lg:gap-14">
          {STEPS.map(s => (
            <motion.article
              key={s.n}
              variants={staggerItem}
              {...cardHover}
              className="cursor-default"
            >
              <div className="font-display italic text-[2rem] text-terracotta mb-6
                              border-b border-ink/10 pb-4 inline-block min-w-[80px]">
                {s.n}
              </div>
              <h3 className="text-[1.55rem] font-medium leading-tight mb-3">
                {s.title}
              </h3>
              <p className="text-ink-soft leading-relaxed text-[0.98rem]">{s.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
