import { motion } from 'framer-motion';

const ITEMS = [
  'CHU Sainte-Justine',
  'Johns Hopkins',
  'INSERM',
  'OMS Genève',
  'King\'s College London',
  'Karolinska Institutet',
  'EFSA Bruxelles',
  'Penguin Random House',
];

export default function Ticker() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="bg-cream-deep border-y border-ink/8 overflow-hidden py-5"
         aria-label="Institutions partenaires" role="region">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 42, ease: 'linear', repeat: Infinity }}
        className="flex gap-14 whitespace-nowrap kicker text-ink-faded w-max"
      >
        {loop.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-14 shrink-0">
            {item}
            <span className="text-sage opacity-50" aria-hidden>·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
