import { motion } from 'framer-motion';
import { fadeUp, springSnap } from '../lib/motion';

export default function CTA() {
  return (
    <section id="cta" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0" aria-hidden style={{
        background: `
          radial-gradient(ellipse 900px 600px at 30% 20%, rgba(194,97,62,0.18) 0%, transparent 65%),
          radial-gradient(ellipse 700px 600px at 80% 80%, rgba(123,139,111,0.14) 0%, transparent 65%)
        `,
      }} />
      <div className="wrap relative z-10 max-w-[720px] text-center">
        <motion.div {...fadeUp}>
          <div className="kicker mb-5 flex items-center justify-center gap-2">
            <span className="sage-dot" /> Premier plan dans 60 secondes
          </div>
          <h2 className="text-[2.6rem] sm:text-[3.6rem] lg:text-[4.4rem] font-medium
                         leading-[1.02] mb-6 tracking-editorial">
            Prête à goûter<br />
            <span className="italic-accent">une nuit douce ?</span>
          </h2>
          <p className="text-[1.1rem] text-ink-soft mb-10 max-w-[48ch] mx-auto leading-relaxed">
            Aucun téléchargement. Aucune carte bancaire pour l'essai.
            Tu écris « bonjour » et on prend le relais.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.2 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <motion.a
            href="#"
            whileHover={{ y: -2 }} whileTap={{ y: 0 }}
            transition={springSnap}
            className="bg-ink text-cream px-7 py-3.5 rounded-pill font-body font-medium
                       inline-flex items-center gap-3 cursor-pointer
                       hover:bg-terracotta-deep transition-colors text-[0.95rem]"
          >
            Démarrer sur WhatsApp
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 7h12M8 1l5 6-5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ y: -2 }} whileTap={{ y: 0 }}
            transition={springSnap}
            className="bg-cream text-ink px-7 py-3.5 rounded-pill font-body font-medium
                       inline-flex items-center gap-2 cursor-pointer
                       border border-ink/15 hover:border-ink transition-colors text-[0.95rem]"
          >
            Démarrer sur Telegram
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
