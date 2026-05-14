import { motion } from 'framer-motion';
import { springSnap } from '../lib/motion';

export default function Nav() {
  const links = [
    { href: '#comment', label: 'Comment ça marche' },
    { href: '#rythme',  label: 'Rythme quotidien' },
    { href: '#stades',  label: 'Stades' },
    { href: '#faq',     label: 'Questions' },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 py-6 bg-cream/85 backdrop-blur-md"
    >
      <div className="wrap flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5 font-body font-medium text-[0.95rem] text-ink no-underline">
          <span className="sage-dot" aria-hidden />
          <span>ParentAtEase</span>
        </a>

        <nav className="hidden md:flex items-center gap-8 font-body text-[0.92rem] text-ink-soft"
             aria-label="Principal">
          {links.map(({ href, label }) => (
            <a key={href} href={href}
               className="hover:text-ink transition-colors cursor-pointer">
              {label}
            </a>
          ))}
        </nav>

        <motion.a
          href="#cta"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          transition={springSnap}
          className="bg-ink text-cream px-5 py-2 rounded-pill text-[0.88rem] font-medium
                     font-body cursor-pointer hover:bg-terracotta-deep transition-colors"
        >
          Commencer
        </motion.a>
      </div>
    </motion.header>
  );
}
