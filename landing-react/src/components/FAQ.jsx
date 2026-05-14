import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp } from '../lib/motion';

const ITEMS = [
  {
    q: 'C\'est de l\'IA ou de vrais expert·es qui répondent ?',
    a: 'Les deux. La rédaction des plans matinaux et des bilans est faite par notre IA, entraînée sur les méthodologies signées de nos 10 expert·es (publications peer-reviewed, livres). Pour les sujets délicats — TDAH, deuil, violence — le bot t\'oriente vers un·e professionnel·le humain. L\'offre Atelier inclut un appel mensuel avec un coach parental humain.',
  },
  {
    q: 'Mes données sont-elles vraiment privées ?',
    a: 'Oui. Conversations stockées en Europe (Railway). Aucun partage avec annonceurs. Aucune revente. Tu peux demander la suppression complète en envoyant « reset » sur WhatsApp. Les profils enfants ne sont jamais utilisés pour entraîner le modèle.',
  },
  {
    q: 'Pourquoi WhatsApp et pas une app dédiée ?',
    a: 'Parce que tu n\'as PAS besoin d\'une app de plus. WhatsApp est déjà dans ta poche, ouvert toute la journée. Zéro friction. Une webapp existe aussi (dashboard détaillé, graphes humeur, historique) mais elle est optionnelle.',
  },
  {
    q: 'Ça remplace un·e pédiatre ou un·e psychologue ?',
    a: 'Non, et on ne le prétendra jamais. ParentAtEase est un coach parental — il accompagne le quotidien (sommeil, repas, crises, communication). Pour tout ce qui touche au médical ou au psychologique grave, on t\'oriente immédiatement vers un·e professionnel·le humain.',
  },
  {
    q: 'Comment annuler ?',
    a: 'Tu envoies « stop » sur WhatsApp — fin des messages programmés. Pour les abonnés payants, l\'annulation se fait depuis le dashboard en 1 clic. Tu gardes l\'accès jusqu\'à la fin de ta période payée.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-28">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mb-16">
          <div className="kicker mb-4 flex items-center gap-2">
            <span className="sage-dot" /> Questions
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05]">
            Ce qu'on te <span className="italic-accent">demande</span><br />
            le plus souvent.
          </h2>
        </motion.div>

        <div className="max-w-[820px]">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="border-t border-ink/10 last:border-b"
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full py-7 flex items-center justify-between gap-6
                             text-left cursor-pointer bg-transparent group"
                >
                  <span className="font-display text-[1.25rem] font-medium leading-snug
                                   group-hover:text-terracotta-deep transition-colors">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="text-[1.6rem] text-terracotta leading-none font-light shrink-0"
                    aria-hidden
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="text-ink-soft leading-relaxed pb-7 pr-12 max-w-[68ch]">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
