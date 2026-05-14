/**
 * Hero — editorial display + 3D phone (R3F) + floating reminders.
 *
 * Layout : asymmetric grid — copy on left (60%), phone scene on right (40%).
 * Mouse position captured here, passed to PhoneScene via ref (refs avoid
 * re-renders that would kill the 60fps useFrame loop).
 */
import { useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, italicReveal, drawLine, springSnap, chatBubble } from '../lib/motion';

// Lazy-load R3F scene (~200KB) so it doesn't block FCP
const PhoneScene = lazy(() => import('../three/PhoneScene.jsx'));

export default function Hero() {
  const cursorRef = useRef({ x: 0, y: 0 });
  const sceneWrapRef = useRef(null);

  // Capture mouse position relative to the scene container, normalized -1..1
  function handleMouseMove(e) {
    const el = sceneWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    cursorRef.current.x = ((e.clientX - r.left) / r.width)  * 2 - 1;
    cursorRef.current.y = ((e.clientY - r.top)  / r.height) * 2 - 1;
  }
  function handleMouseLeave() {
    cursorRef.current.x = 0;
    cursorRef.current.y = 0;
  }

  return (
    <section className="warm-gradient relative pt-10 pb-28 overflow-hidden"
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}>
      <div className="wrap grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">

        {/* ─── Left: editorial copy ─────────────────────────── */}
        <div>
          <motion.div
            {...fadeUp}
            className="inline-flex items-center gap-2 bg-ink/95 text-cream
                       py-1.5 pl-1.5 pr-4 rounded-pill text-[0.78rem] mb-10"
          >
            <span className="bg-cream text-ink px-2 py-0.5 rounded-pill font-semibold text-[0.7rem]">
              Nouveau
            </span>
            <span className="font-medium opacity-90">Disponible sur WhatsApp &amp; Telegram</span>
          </motion.div>

          <h1 className="display-xl font-medium text-ink mb-8
                         text-[3rem] sm:text-[4rem] lg:text-[5.4rem]
                         leading-[1.02] tracking-editorial">
            <motion.span
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              Un coach qui te connaît,
            </motion.span>
            <span className="block whitespace-nowrap">
              <motion.span {...italicReveal(0.5)} className="italic-accent inline-block mr-3">
                au creux
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                de ta poche.
              </motion.span>
            </span>
            <span className="block relative inline-block mt-2">
              <motion.span
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="italic-accent inline-block"
              >
                Tous les jours.
              </motion.span>
              <motion.span
                {...drawLine(1.5)}
                className="absolute left-0 right-0 -bottom-2 h-[3px] bg-sage origin-left rounded-full"
                style={{ width: '70%' }}
              />
            </span>
          </h1>

          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.4 }}
            className="text-[1.12rem] text-ink-soft max-w-[48ch] leading-[1.65] mb-10 font-light"
          >
            ParentAtEase t'envoie chaque matin un plan parental adapté à l'âge et à la
            personnalité de ton enfant. Un bilan le soir. Un point chaque dimanche.
            <span className="italic-accent block mt-2 not-italic font-medium">
              Le reste du temps, écris-lui — comme à un·e ami·e qui s'y connaît.
            </span>
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.55 }}
            className="flex flex-wrap items-center gap-4 mb-10"
          >
            <motion.a
              href="#cta"
              whileHover={{ y: -2 }} whileTap={{ y: 0 }}
              transition={springSnap}
              className="bg-ink text-cream px-7 py-3.5 rounded-pill
                         font-body font-medium text-[0.95rem]
                         inline-flex items-center gap-2 cursor-pointer
                         hover:bg-terracotta-deep transition-colors"
            >
              Commencer
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 7h12M8 1l5 6-5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.a>
            <a href="#comment"
               className="text-ink-soft hover:text-terracotta-deep transition-colors
                          underline underline-offset-4 decoration-1 decoration-terracotta/40
                          font-body text-[0.95rem] cursor-pointer">
              Comment ça marche →
            </a>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.7 }}
            className="flex items-center gap-5 text-[0.85rem] text-ink-faded font-medium"
          >
            <div className="flex -space-x-2">
              {['🩺', '🧠', '😴'].map((e, i) => (
                <span key={i}
                      className="w-7 h-7 rounded-full bg-cream-deep border-2 border-cream
                                 grid place-items-center text-xs">
                  {e}
                </span>
              ))}
            </div>
            <span><strong className="text-ink">3 200 familles</strong> · 18 pays · ★ 4,8</span>
          </motion.div>
        </div>

        {/* ─── Right: 3D phone scene + floating tooltips ─────── */}
        <div ref={sceneWrapRef} className="relative w-full aspect-[3/4] max-w-[480px] mx-auto lg:mx-0">
          {/* The R3F canvas fills the box */}
          <Suspense fallback={<PhoneFallback />}>
            <div className="absolute inset-0">
              <PhoneScene cursorRef={cursorRef} />
            </div>
          </Suspense>

          {/* Floating reminders (HTML overlays with parallax depth) */}
          <FloatingReminder
            kicker="Rappel · ce soir"
            text="Signer la sortie scolaire de Lina"
            style={{ top: '12%', left: '-8%' }}
            delay={1.6}
          />
          <FloatingReminder
            kicker="Routine · 19:30"
            text="Wind-down · lumières tamisées"
            style={{ top: '42%', right: '-10%' }}
            delay={2.1}
          />
          <FloatingReminder
            kicker="Aujourd'hui"
            text="Aucune notification inutile"
            style={{ bottom: '6%', left: '15%' }}
            delay={2.6}
            subtle
          />
        </div>
      </div>
    </section>
  );
}

// ─── Floating reminder card (DOM overlay) ────────────────────
function FloatingReminder({ kicker, text, style, delay = 0, subtle = false }) {
  return (
    <motion.div
      {...chatBubble(delay)}
      style={style}
      className={`absolute z-10 max-w-[220px] backdrop-blur-md
                  ${subtle
                    ? 'bg-sage/95 text-cream'
                    : 'bg-cream/95 text-ink border border-ink/8'}
                  rounded-2xl px-4 py-3 shadow-card font-body
                  pointer-events-none select-none`}
    >
      <div className={`kicker mb-1 ${subtle ? 'text-cream/70' : 'text-terracotta-deep'}`}>
        {kicker}
      </div>
      <div className={`text-[0.88rem] leading-snug font-medium
                       ${subtle ? 'text-cream' : 'text-ink'}`}>
        {text}
      </div>
    </motion.div>
  );
}

// ─── Suspense fallback (visible while R3F bundle loads) ─────
function PhoneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[60%] aspect-[9/19] bg-cream-deep/40 rounded-[40px]
                      animate-breathing" />
    </div>
  );
}
