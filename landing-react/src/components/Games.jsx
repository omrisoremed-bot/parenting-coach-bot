import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, cardHover, springSnap } from '../lib/motion';

const GAMES = [
  { age: '2–4 ans',  title: 'La chasse aux couleurs',  desc: '« Trouve-moi 3 choses oranges dans la maison ». 5 min, zéro matériel, vocabulaire qui explose.', energy: 'Calme',  loc: 'Intérieur' },
  { age: '3–5 ans',  title: 'Le restaurant imaginaire', desc: 'L\'enfant prend ta commande, te sert, encaisse. Langage, motricité fine, lien fort.',           energy: 'Moyen',  loc: 'Intérieur' },
  { age: '5–8 ans',  title: 'Chasse au trésor maison', desc: '5 indices écrits, 1 trésor (raisin, câlin). Lecture, logique — et toi tu reprends ton souffle.', energy: 'Actif',  loc: 'Intérieur' },
  { age: '8–12 ans', title: 'Le code secret du dîner', desc: 'Vous parlez en code (chiffres = lettres). Les ados sortent du silence — presque magique.',      energy: 'Calme',  loc: 'À table' },
];

export default function Games() {
  return (
    <section className="bg-cream-deep py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Le bot répond aussi à « jeu »
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05] mb-5">
            «&nbsp;Maman, <span className="italic-accent">on joue ?</span>&nbsp;»<br />
            On a la réponse.
          </h2>
          <p className="text-[1.05rem] text-ink-soft max-w-[58ch] leading-relaxed">
            60 jeux dans la base : par âge, par énergie, par lieu. Tu envoies
            « jeu » sur WhatsApp et on te propose celui qui te va — maintenant.
          </p>
        </motion.div>

        <motion.div {...staggerContainer} className="grid sm:grid-cols-2 gap-6 mb-12">
          {GAMES.map((g, i) => (
            <motion.article
              key={i}
              variants={staggerItem}
              {...cardHover}
              className="bg-cream rounded-2xl p-7 border border-ink/8 cursor-default
                         shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="kicker text-terracotta-deep">{g.age}</span>
                <span className="text-[0.78rem] text-ink-faded font-medium">
                  {g.loc} · {g.energy}
                </span>
              </div>
              <h3 className="font-display text-[1.45rem] font-medium leading-tight mb-3">
                {g.title}
              </h3>
              <p className="text-ink-soft text-[0.95rem] leading-relaxed">{g.desc}</p>
            </motion.article>
          ))}
        </motion.div>

        <div>
          <motion.a
            href="#cta"
            whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            transition={springSnap}
            className="inline-flex items-center gap-2 text-ink-soft hover:text-terracotta-deep
                       transition-colors font-body text-[0.95rem] cursor-pointer
                       underline underline-offset-4 decoration-1 decoration-terracotta/40"
          >
            Recevoir mon premier jeu →
          </motion.a>
          <span className="ml-4 font-display italic text-[1rem] text-ink-faded">
            et 56 autres dans le bot
          </span>
        </div>
      </div>
    </section>
  );
}
