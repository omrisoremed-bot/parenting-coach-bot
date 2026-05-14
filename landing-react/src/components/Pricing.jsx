import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, springSnap } from '../lib/motion';

const PLANS = [
  {
    name: 'Famille',
    blurb: 'Pour le quotidien — tous tes enfants, tous tes jours.',
    price: '9,90',
    period: '€ par mois',
    yearly: 'ou 79 € / an · économise 38 €',
    bullets: [
      'Enfants illimités',
      'Plans matinaux & conversations sans limite',
      'Check-in du soir + bilan du dimanche',
      '60 jeux parent-enfant',
      'Export PDF mensuel',
    ],
    cta: 'Commencer l\'essai',
    href: '/webapp/?signup=family_monthly',
    popular: true,
  },
  {
    name: 'Atelier',
    blurb: 'Pour les passages plus difficiles — humain inclus.',
    price: '24,90',
    period: '€ par mois',
    yearly: 'ou 199 € / an · économise 99 €',
    bullets: [
      'Tout l\'abonnement Famille',
      '1 appel humain mensuel (30 min, coach certifié)',
      'Groupe WhatsApp privé par tranche d\'âge',
      'Cartes jeux imprimables PDF',
      'Bilan mensuel personnalisé par email',
    ],
    cta: 'Réserver une place',
    href: '/webapp/?signup=atelier_monthly',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="offres" className="py-28 bg-cream">
      <div className="wrap">
        <motion.div {...fadeUp} className="max-w-[700px] mx-auto mb-16 text-center">
          <div className="kicker mb-4 flex items-center justify-center gap-2">
            <span className="sage-dot" /> Tarifs · essai gratuit 7 jours
          </div>
          <h2 className="text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-medium leading-[1.05] mb-5">
            Tu commences par<br />
            <span className="italic-accent">sept jours</span> gratuits.
          </h2>
          <p className="text-[1.05rem] text-ink-soft max-w-[52ch] mx-auto leading-relaxed">
            Pas de carte coupée avant la fin de l'essai. Annulable à tout
            moment depuis ton dashboard, en un clic.
          </p>
        </motion.div>

        <motion.div {...staggerContainer}
                    className="grid md:grid-cols-2 gap-7 max-w-[920px] mx-auto items-start">
          {PLANS.map((p, i) => (
            <motion.article
              key={i}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className={`relative bg-cream-deep/40 rounded-3xl p-9 cursor-default
                          border ${p.popular ? 'border-sage' : 'border-ink/8'}
                          ${p.popular ? 'shadow-card-hover' : 'shadow-card'}`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-9 bg-sage text-cream px-3 py-1
                                 rounded-pill kicker text-[0.66rem]">
                  Choix le plus aimé
                </span>
              )}

              <div className="kicker text-terracotta-deep mb-2">Essai 7 jours</div>
              <div className="font-display text-[2rem] font-medium leading-tight mb-2">
                {p.name}
              </div>
              <p className="text-ink-soft text-[0.95rem] leading-relaxed mb-7">{p.blurb}</p>

              <div className="font-display text-[3.4rem] font-medium leading-none mb-1">
                {p.price}
                <span className="text-[1.1rem] text-ink-soft font-body font-normal ml-1">
                  {p.period}
                </span>
              </div>
              <div className="text-[0.82rem] text-ink-faded mb-8">{p.yearly}</div>

              <ul className="border-t border-ink/8 pt-6 mb-8 space-y-3 list-none">
                {p.bullets.map((b, j) => (
                  <li key={j} className="flex gap-3 text-[0.95rem] leading-snug text-ink">
                    <span className="text-sage shrink-0 mt-[3px]" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <motion.a
                href={p.href}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                transition={springSnap}
                className={`block w-full text-center font-body font-medium px-6 py-3.5
                            rounded-pill cursor-pointer transition-colors
                            ${p.popular
                              ? 'bg-ink text-cream hover:bg-terracotta-deep'
                              : 'bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-cream'}`}
              >
                {p.cta} →
              </motion.a>
            </motion.article>
          ))}
        </motion.div>

        <p className="text-center mt-10 text-[0.82rem] text-ink-faded font-medium">
          Paiement sécurisé Stripe · TVA incluse · Sans engagement
        </p>
      </div>
    </section>
  );
}
