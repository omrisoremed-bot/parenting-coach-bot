const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '#comment', label: 'Comment ça marche' },
      { href: '#stades',  label: 'Nos expert·es' },
      { href: '#offres',  label: 'Tarifs' },
      { href: '/webapp/', label: 'Webapp parent' },
    ],
  },
  {
    title: 'Le journal',
    note: 'Hébergé sur un sous-domaine dédié.',
    links: [
      { href: 'https://blog.parentatease.com/sommeil',       label: 'Sommeil' },
      { href: 'https://blog.parentatease.com/discipline',    label: 'Discipline positive' },
      { href: 'https://blog.parentatease.com/developpement', label: 'Développement' },
      { href: 'https://blog.parentatease.com/nutrition',     label: 'Nutrition' },
      { href: 'https://blog.parentatease.com/adolescence',   label: 'Adolescence' },
    ],
  },
  {
    title: 'Maison',
    links: [
      { href: '/methodology.html', label: 'Notre méthodologie' },
      { href: '#',                 label: 'À propos' },
      { href: '#',                 label: 'Contact' },
      { href: '#',                 label: 'Mentions légales' },
      { href: '#',                 label: 'RGPD & cookies' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-carbon text-cream/85 pt-20 pb-8">
      <div className="wrap">
        <div className="grid md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 mb-16">
          <div>
            <a href="/" className="flex items-center gap-2.5 mb-5 text-cream no-underline
                                    font-body font-medium text-[1rem]">
              <span className="sage-dot" aria-hidden />
              ParentAtEase
            </a>
            <p className="text-cream/55 text-[0.92rem] leading-relaxed max-w-[40ch] mb-8 font-light">
              Un coach parental au creux de ta poche.
              <span className="italic-accent block mt-1 not-italic text-cream/80 font-medium">
                Dix voix, dix-huit pays, zéro jugement.
              </span>
            </p>
            <div className="flex gap-4 text-[0.85rem]">
              {[
                { l: 'Instagram', h: '#' }, { l: 'TikTok', h: '#' },
                { l: 'LinkedIn',  h: '#' }, { l: 'YouTube', h: '#' },
              ].map((s, i) => (
                <a key={i} href={s.h}
                   className="text-cream/55 hover:text-terracotta transition-colors cursor-pointer
                              underline underline-offset-4 decoration-1 decoration-cream/20">
                  {s.l}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col, i) => (
            <div key={i}>
              <h4 className="kicker text-cream/60 mb-4">{col.title}</h4>
              {col.note && (
                <p className="text-cream/35 text-[0.78rem] mb-3 leading-snug italic">
                  {col.note}
                </p>
              )}
              {col.links.map((l, j) => (
                <a key={j} href={l.href}
                   className="block text-cream/65 hover:text-cream py-1 text-[0.92rem]
                              cursor-pointer transition-colors font-light">
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-cream/10 pt-7 flex flex-wrap justify-between gap-3
                        text-[0.8rem] text-cream/40 font-light">
          <span>© ParentAtEase 2026 — Casablanca · Paris · Montréal</span>
          <span>FR · EN · ES · PT · العربية</span>
        </div>
      </div>
    </footer>
  );
}
