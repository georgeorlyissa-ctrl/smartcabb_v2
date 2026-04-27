import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';

// ─── IMAGES ───────────────────────────────────────────────────
const IMG_CAR    = 'https://images.unsplash.com/photo-1479226414628-56b454fc107e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const IMG_APP    = 'https://images.unsplash.com/photo-1607194746135-2791d57a9761?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const IMG_SEC    = 'https://images.unsplash.com/photo-1581956381500-9c8edc8b259e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const IMG_PAY    = 'https://images.unsplash.com/photo-1533234944761-2f5337579079?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';

// ─── SLIDES HERO ──────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    gradient: 'from-blue-800 to-cyan-600',
    image: IMG_CAR,
    badge: '🎁 OFFRE',
    title: '+5 000 CDF offerts',
    sub: 'Pour tout rechargement de 10 000 CDF',
    cta: 'Recharger',
    screen: 'wallet',
  },
  {
    id: 2,
    gradient: 'from-emerald-800 to-teal-600',
    image: IMG_SEC,
    badge: '🔒 SÉCURITÉ',
    title: 'Chauffeurs certifiés',
    sub: 'Permis · Assurance · Dossier vérifié',
    cta: 'Découvrir',
    screen: null,
  },
  {
    id: 3,
    gradient: 'from-violet-800 to-fuchsia-600',
    image: IMG_APP,
    badge: '💳 PAIEMENT',
    title: 'Tous modes acceptés',
    sub: 'Cash · Mobile Money · Wallet · Carte',
    cta: 'Voir',
    screen: 'payment-method',
  },
];

// ─── FEATURES CARDS ───────────────────────────────────────────
const FEATURES = [
  { id: 1, img: IMG_SEC, title: 'Sécurisé', sub: 'Suivi GPS live', g: 'from-blue-900/80 to-cyan-700/70' },
  { id: 2, img: IMG_PAY, title: 'Mobile Money', sub: 'Orange · Airtel', g: 'from-green-900/80 to-emerald-700/70' },
  { id: 3, img: IMG_CAR, title: 'Prix fixe', sub: 'Pas de surprise', g: 'from-purple-900/80 to-fuchsia-700/70' },
  { id: 4, img: IMG_APP, title: 'Notre site', sub: 'smartcabb.com ↗', g: 'from-orange-900/80 to-rose-700/70', link: 'https://smartcabb.com' },
];

// ─── PERKS ────────────────────────────────────────────────────
const PERKS = [
  { e: '⚡', l: 'Rapide' },
  { e: '🛡️', l: 'Assuré' },
  { e: '⭐', l: '4.8/5' },
  { e: '🎁', l: 'Bonus' },
  { e: '📍', l: 'GPS live' },
  { e: '💬', l: '24/7' },
];

// ─── SITE SMARTCABB ───────────────────────────────────────────
const SMARTCABB_SITE = 'https://smartcabb.com';

export function SmartCabbPromoSection() {
  const { setCurrentScreen } = useAppState();
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4200);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goTo = (i: number) => { setActive(i); resetTimer(); };
  const slide = SLIDES[active];

  return (
    <div className="space-y-3 pt-1">

      {/* ── Divider ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SmartCabb</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* ── Pills avantages ───────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {PERKS.map(p => (
          <div key={p.l} className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 flex-shrink-0">
            <span className="text-[11px]">{p.e}</span>
            <span className="text-[10px] font-bold text-blue-700 whitespace-nowrap">{p.l}</span>
          </div>
        ))}
      </div>

      {/* ── Hero carousel ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ height: 120 }}>
        <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-88 transition-all duration-700`} />

        <div className="relative z-10 h-full flex flex-col justify-between p-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block text-[8px] font-black bg-white/25 text-white px-2 py-0.5 rounded-full mb-1">
                {slide.badge}
              </span>
              <p className="text-white font-black text-base leading-tight">{slide.title}</p>
              <p className="text-white/80 text-[10px]">{slide.sub}</p>
            </div>
            {/* Logo */}
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/30 flex-shrink-0">
              <span className="text-white font-black text-[9px]">SC</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => { if (slide.screen) { try { setCurrentScreen(slide.screen as any); } catch {} } }}
              className="bg-white/25 backdrop-blur-sm border border-white/40 text-white text-[10px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              {slide.cta} →
            </button>
            <div className="flex gap-1">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className={`rounded-full transition-all ${i === active ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/45'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Titre section ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-bold text-gray-900">Découvrez SmartCabb</h3>
        <a href={SMARTCABB_SITE} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-blue-600 font-semibold">
          En savoir plus →
        </a>
      </div>

      {/* ── Grille 2×2 feature cards ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5">
        {FEATURES.map(card => {
          const inner = (
            <>
              <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-br ${card.g}`} />
              <div className="relative z-10 h-full flex flex-col justify-between p-2.5">
                <p className="text-white font-black text-xs leading-tight">{card.title}</p>
                <p className="text-white/75 text-[9px]">{card.sub}</p>
              </div>
            </>
          );
          return card.link ? (
            <a key={card.id} href={card.link} target="_blank" rel="noopener noreferrer"
              className="relative rounded-xl overflow-hidden shadow-sm active:scale-95 transition-transform"
              style={{ height: 78 }}>
              {inner}
            </a>
          ) : (
            <div key={card.id} className="relative rounded-xl overflow-hidden shadow-sm" style={{ height: 78 }}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* ── Bannière site vitrine ─────────────────────────────── */}
      <a
        href={SMARTCABB_SITE}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 rounded-2xl px-4 py-3 shadow-md active:scale-95 transition-transform block"
        onClick={e => { e.preventDefault(); window.open(SMARTCABB_SITE, '_blank', 'noopener,noreferrer'); }}
      >
        <div>
          <p className="text-white font-black text-sm">smartcabb.com</p>
          <p className="text-white/55 text-[9px] mt-0.5">Transport connecté & sécurisé · Kinshasa, RDC</p>
        </div>
        <span className="flex-shrink-0 bg-white text-gray-900 text-[10px] font-black px-3 py-2 rounded-lg">
          Visiter →
        </span>
      </a>

      {/* Footer */}
      <p className="text-[8px] text-center text-gray-300 pb-1">
        SmartCabb © 2025 · Tous droits réservés
      </p>
    </div>
  );
}
