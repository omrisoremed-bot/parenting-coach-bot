/**
 * Hero — Editorial copy + CSS iPhone mockup + Framer Motion tilt.
 *
 * NO Three.js — clean CSS frame with realistic iPhone 15 chrome.
 * Tilt on mousemove via useMotionValue → useSpring → rotateX/Y CSS transform.
 * Inspired by theparentingpassport.com + erin-taylor.com pain-recognition pattern.
 */
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { fadeUp, italicReveal, drawLine, springSnap, chatBubble } from '../lib/motion';
import { Leaf, HeartSmall, SmallStar, CurlyArrow, Brushstroke, FlowerBud, Bird } from '../lib/Flourish';

export default function Hero() {
  return (
    <section className="warm-gradient relative pt-10 pb-28 overflow-hidden">
      {/* ─── Decorative flourishes (Parenting Passport-style) ───────── */}
      <Leaf className="absolute top-[8%] left-[6%] w-8 h-8 text-sage/40 -rotate-12 hidden lg:block" />
      <FlowerBud className="absolute top-[18%] right-[42%] w-5 h-5 text-terracotta/35 rotate-12 hidden lg:block" />
      <SmallStar className="absolute bottom-[28%] left-[44%] w-4 h-4 text-terracotta/45 hidden md:block" />
      <Bird className="absolute top-[14%] right-[12%] w-8 h-6 text-sage/50 hidden lg:block" />
      <HeartSmall className="absolute bottom-[14%] left-[8%] w-4 h-4 text-terracotta/40 hidden md:block" />

      <div className="wrap grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center relative">

        {/* ─── Left: editorial copy ─────────────────────────── */}
        <div>
          {/* Pain-recognition eyebrow (Erin Taylor pattern) */}
          <motion.div {...fadeUp} className="mb-6 flex items-center gap-3">
            <span className="font-display italic text-[1.1rem] sm:text-[1.25rem]
                             text-ink-soft tracking-tight leading-snug">
              Les crises. Le refus. L'épuisement.
            </span>
            <CurlyArrow className="w-9 h-9 text-terracotta/60 rotate-[15deg] -ml-1" stroke={1.4} />
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-ink/95 text-cream
                       py-1.5 pl-1.5 pr-4 rounded-pill text-[0.78rem] mb-8"
          >
            <span className="bg-cream text-ink px-2 py-0.5 rounded-pill font-semibold text-[0.7rem]">
              Nouveau
            </span>
            <span className="font-medium opacity-90">Disponible sur WhatsApp &amp; Telegram</span>
          </motion.div>

          <h1 className="display-xl font-medium text-ink mb-8
                         text-[2.8rem] sm:text-[3.8rem] lg:text-[5rem]
                         leading-[1.02] tracking-editorial">
            <motion.span
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              Un coach qui te connaît,
            </motion.span>
            <span className="block">
              <motion.span {...italicReveal(0.5)} className="italic-accent inline-block mr-3 relative">
                au creux
                <motion.span
                  {...drawLine(1.2)}
                  className="absolute left-0 right-0 -bottom-1 text-terracotta origin-left block"
                  style={{ width: '100%' }}
                >
                  <Brushstroke className="w-full h-2 text-terracotta/60" stroke={2.5} />
                </motion.span>
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                de ta poche.
              </motion.span>
            </span>
            <motion.span
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="italic-accent inline-block mt-1"
            >
              Tous les jours.
            </motion.span>
          </h1>

          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.5 }}
            className="text-[1.12rem] text-ink-soft max-w-[48ch] leading-[1.65] mb-10 font-light"
          >
            ParentAtEase t'envoie chaque matin un plan parental adapté à l'âge et à la
            personnalité de ton enfant. Un bilan le soir. Un point chaque dimanche.
            <span className="block mt-2 font-medium text-ink">
              Le reste du temps, écris-lui — comme à un·e ami·e qui s'y connaît.
            </span>
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.65 }}
            className="flex flex-wrap items-center gap-5 mb-10"
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
                          font-body text-[0.95rem] cursor-pointer inline-flex items-center gap-2">
              <span className="underline underline-offset-4 decoration-1 decoration-terracotta/40">
                Comment ça marche
              </span>
              →
            </a>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.8 }}
            className="flex items-center gap-5 text-[0.85rem] text-ink-faded font-medium"
          >
            <div className="flex -space-x-2">
              {['🇨🇦', '🇧🇷', '🇸🇪', '🇯🇵', '🇮🇳'].map((flag, i) => (
                <span key={i}
                      className="w-7 h-7 rounded-full bg-cream-deep border-2 border-cream
                                 grid place-items-center text-xs">
                  {flag}
                </span>
              ))}
            </div>
            <span>
              <strong className="text-ink">3 200 familles</strong> dans 18 pays
              <span className="mx-1.5 text-sage">·</span>
              ★ 4,8 <span className="text-ink-faded">/ 5</span>
            </span>
          </motion.div>
        </div>

        {/* ─── Right: pixel-perfect iPhone mockup with tilt ─────── */}
        <IPhoneMockup />
      </div>
    </section>
  );
}

// ─── CSS iPhone mockup with Framer Motion tilt ─────────────
function IPhoneMockup() {
  const wrapRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Map -160..160px → ±6° tilt
  const rotateY = useSpring(useTransform(mx, [-160, 160], [-6, 6]), {
    stiffness: 120, damping: 22, mass: 0.8,
  });
  const rotateX = useSpring(useTransform(my, [-160, 160], [4, -4]), {
    stiffness: 120, damping: 22, mass: 0.8,
  });

  function onMove(e) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  }
  function onLeave() {
    mx.set(0); my.set(0);
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative w-full max-w-[360px] mx-auto lg:mx-0 justify-self-end"
      style={{ perspective: 1200 }}
    >
      {/* Soft glow behind phone */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-60 pointer-events-none"
           style={{
             background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(194,97,62,.18), transparent 70%)',
           }} aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -6 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        style={{
          rotateX, rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative"
      >
        <IPhoneFrame />
      </motion.div>

      {/* ─── Floating reminders around the phone (HTML overlays) ─ */}
      <FloatingReminder
        kicker="Rappel · ce soir"
        text="Signer la sortie scolaire de Lina"
        style={{ top: '10%', left: '-12%' }}
        delay={1.4}
      />
      <FloatingReminder
        kicker="Routine · 19:30"
        text="Wind-down · lumières tamisées"
        style={{ top: '40%', right: '-14%' }}
        delay={1.9}
      />
      <FloatingReminder
        kicker="Aujourd'hui"
        text="Aucune notification inutile"
        style={{ bottom: '8%', left: '8%' }}
        delay={2.4}
        subtle
      />
    </div>
  );
}

// ─── The iPhone frame itself (pure CSS) ────────────────────
function IPhoneFrame() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: '100%',
        aspectRatio: '9 / 19',
        maxWidth: 340,
      }}
    >
      {/* Outer chrome — ink/carbon gradient + subtle highlight */}
      <div className="absolute inset-0 rounded-[44px] p-[10px]"
           style={{
             background: 'linear-gradient(160deg, #2b2826 0%, #15130f 50%, #25221e 100%)',
             boxShadow: `
               0 1px 1px rgba(255,255,255,.08) inset,
               0 -1px 1px rgba(0,0,0,.4) inset,
               0 30px 60px -20px rgba(26,26,26,.55),
               0 18px 36px -8px rgba(194,97,62,.18)
             `,
           }}>
        {/* Inner bezel ring */}
        <div className="absolute inset-[6px] rounded-[36px]"
             style={{
               background: '#0a0908',
               boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.05)',
             }} />

        {/* Screen */}
        <div className="absolute inset-[10px] rounded-[34px] overflow-hidden"
             style={{ background: 'linear-gradient(180deg,#F5F1E8 0%, #EDE7DA 100%)' }}>
          <ScreenContent />
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[100px] h-[28px] rounded-full bg-black z-10"
             style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.04)' }}>
          <span className="absolute top-1/2 right-3 -translate-y-1/2 w-[6px] h-[6px] rounded-full
                           bg-[#2a2a2a] ring-1 ring-[#0d0d0d]" />
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute top-[110px] -left-[2px] w-[3px] h-[28px] rounded-l-sm bg-gradient-to-r from-[#0d0c0a] to-[#1d1b18]" />
      <div className="absolute top-[180px] -left-[2px] w-[3px] h-[54px] rounded-l-sm bg-gradient-to-r from-[#0d0c0a] to-[#1d1b18]" />
      <div className="absolute top-[260px] -left-[2px] w-[3px] h-[54px] rounded-l-sm bg-gradient-to-r from-[#0d0c0a] to-[#1d1b18]" />
      <div className="absolute top-[170px] -right-[2px] w-[3px] h-[80px] rounded-r-sm bg-gradient-to-l from-[#0d0c0a] to-[#1d1b18]" />
    </div>
  );
}

// ─── Screen content (chat) ────────────────────────────────
function ScreenContent() {
  return (
    <div className="relative w-full h-full font-body select-none"
         style={{ background: 'linear-gradient(180deg,#F5F1E8 0%, #EDE7DA 100%)' }}>
      {/* Status bar */}
      <div className="absolute top-[12px] left-6 right-6 flex justify-between items-center
                      text-[10px] font-semibold text-ink">
        <span>8:02</span>
        <span className="invisible">.</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-[8px]">5G</span>
          <span className="w-4 h-2 border border-ink rounded-[2px] inline-block relative">
            <span className="absolute inset-[1px] right-[5px] bg-ink rounded-[1px]" />
          </span>
        </span>
      </div>

      {/* Convo header */}
      <div className="absolute top-[60px] left-0 right-0 px-4 pb-3 border-b border-ink/8
                      flex items-center gap-2.5 bg-cream/85 backdrop-blur-sm z-10">
        <div className="w-9 h-9 rounded-full grid place-items-center text-[1rem] shrink-0"
             style={{ background: 'linear-gradient(135deg, #C2613E, #7B8B6F)' }}>
          🌱
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold leading-tight text-ink">ParentAtEase</div>
          <div className="text-[9px] text-sage font-medium">en ligne</div>
        </div>
        <span className="text-[14px] text-ink-soft">⋯</span>
      </div>

      {/* Chat area */}
      <div className="absolute top-[114px] left-0 right-0 bottom-[58px] overflow-hidden px-3 py-3
                      flex flex-col gap-2.5">
        <div className="text-[9px] text-ink-faded text-center mb-1">Mardi · 19h42</div>

        {/* Bubble 1 — parent */}
        <motion.div
          {...chatBubble(0.8)}
          className="self-end max-w-[78%] bg-ink text-cream px-3 py-2 rounded-[14px] rounded-br-[4px]
                     text-[11px] leading-[1.4] font-medium"
        >
          Lina refuse d'aller au lit, elle pleure. J'en peux plus.
        </motion.div>

        {/* Bubble 2 — bot rich */}
        <motion.div
          {...chatBubble(1.5)}
          className="self-start max-w-[88%] bg-white px-3 py-2.5 rounded-[14px] rounded-bl-[4px]
                     text-[11px] leading-[1.45] border border-ink/6"
        >
          <div className="text-[8.5px] text-sage font-bold tracking-[0.08em] uppercase mb-1">
            Étienne · Sommeil
          </div>
          <div className="font-semibold text-ink">
            Pose-toi à côté de son lit, sans rien dire.
          </div>
          <div className="mt-1 text-ink-soft">
            3 minutes. Sa colère a besoin d'un témoin avant d'avoir besoin d'une solution.
          </div>
        </motion.div>

        {/* Bubble 3 — Lina (italic terracotta) */}
        <motion.div
          {...chatBubble(2.3)}
          className="self-end max-w-[70%] px-3 py-2 rounded-[14px] rounded-br-[4px]
                     text-[11px] leading-[1.4] font-medium italic"
          style={{ background: '#C2613E', color: '#F5F1E8' }}
        >
          « Maman… reste encore un peu. »
          <span className="block text-[8.5px] not-italic opacity-75 mt-1">
            — Lina, 20h14 🌙
          </span>
        </motion.div>
      </div>

      {/* Input bar */}
      <div className="absolute bottom-2 left-3 right-3 bg-white border border-ink/8 rounded-full
                      px-3 py-1.5 flex items-center justify-between text-[10px] text-ink-faded">
        <span>Écris un message…</span>
        <span className="w-5 h-5 rounded-full bg-sage grid place-items-center text-cream text-[10px]">▶</span>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[100px] h-[3px] rounded-full bg-ink/30" />
    </div>
  );
}

// ─── Floating reminder (DOM overlay with parallax depth) ─────
function FloatingReminder({ kicker, text, style, delay = 0, subtle = false }) {
  return (
    <motion.div
      {...chatBubble(delay)}
      style={{ ...style, transform: `translateZ(${subtle ? '20px' : '50px'})` }}
      className={`absolute z-20 max-w-[200px] backdrop-blur-md
                  ${subtle
                    ? 'bg-sage/95 text-cream'
                    : 'bg-cream/95 text-ink border border-ink/10'}
                  rounded-2xl px-4 py-3 shadow-card font-body
                  pointer-events-none select-none`}
    >
      <div className={`kicker mb-1 text-[0.66rem] ${subtle ? 'text-cream/75' : 'text-terracotta-deep'}`}>
        {kicker}
      </div>
      <div className={`text-[0.84rem] leading-snug font-medium
                       ${subtle ? 'text-cream' : 'text-ink'}`}>
        {text}
      </div>
    </motion.div>
  );
}
