import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';

// ─── IMAGES UNSPLASH ──────────────────────────────────────────
const IMG_CAR_NIGHT    = 'https://images.unsplash.com/photo-1479226414628-56b454fc107e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';
const IMG_APP_BOOKING  = 'https://images.unsplash.com/photo-1607194746135-2791d57a9761?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';
const IMG_SECURITY     = 'https://images.unsplash.com/photo-1581956381500-9c8edc8b259e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';
const IMG_PAYMENT      = 'https://images.unsplash.com/photo-1533234944761-2f5337579079?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800';

// ─── DONNÉES DES SLIDES HERO ──────────────────────────────────
const HERO_SLIDES = [
  {
    id: 1,
    bg: 'from-blue-700 via-blue-600 to-cyan-500',
    image: IMG_CAR_NIGHT,
    badge: '🎁 OFFRE DE BIENVENUE',
    title: 'Rechargez 10 000 CDF',
    subtitle: 'et recevez 5 000 CDF offerts !',
    cta: 'Recharger maintenant',
    screen: 'wallet' as const,
    tag: 'BONUS',
    tagColor: 'bg-yellow-400 text-yellow-900',
  },
  {
    id: 2,
    bg: 'from-emerald-700 via-green-600 to-teal-500',
    image: IMG_SECURITY,
    badge: '🔒 100% SÉCURISÉ',
    title: 'Chauffeurs vérifiés',
    subtitle: 'Permis · Assurance · Casier judiciaire',
    cta: 'En savoir plus',
    screen: null,
    tag: 'SÉCURITÉ',
    tagColor: 'bg-green-300 text-green-900',
  },
  {
    id: 3,
    bg: 'from-violet-700 via-purple-600 to-fuchsia-500',
    image: IMG_APP_BOOKING,
    badge: '💳 MULTI-PAIEMENT',
    title: 'Payez comme vous voulez',
    subtitle: 'Cash · Mobile Money · Wallet · Carte',
    cta: 'Voir les options',
    screen: 'payment-method' as const,
    tag: 'PRATIQUE',
    tagColor: 'bg-purple-300 text-purple-900',
  },
];

// ─── CARTES "DÉCOUVRIR SMARTCABB" ─────────────────────────────
const FEATURE_CARDS = [
  {
    id: 1,
    image: IMG_SECURITY,
    title: 'COURSES\nSÉCURISÉES',
    desc: 'Chaque trajet est suivi en temps réel',
    gradient: 'from-blue-900/80 to-blue-600/60',
  },
  {
    id: 2,
    image: IMG_PAYMENT,
    title: 'MOBILE\nMONEY',
    desc: 'Orange · Airtel · M-Pesa acceptés',
    gradient: 'from-green-900/80 to-emerald-600/60',
  },
  {
    id: 3,
    image: IMG_CAR_NIGHT,
    title: 'PRIX\nTRANSPARENTS',
    desc: 'Tarif affiché avant chaque course',
    gradient: 'from-purple-900/80 to-fuchsia-600/60',
  },
  {
    id: 4,
    image: IMG_APP_BOOKING,
    title: 'SITE\nVITRINE',
    desc: 'Découvrez SmartCabb.com',
    gradient: 'from-orange-900/80 to-rose-600/60',
    isLink: true,
    href: 'https://smartcabb.com',
  },
];

// ─── AVANTAGES RAPIDES ────────────────────────────────────────
const QUICK_PERKS = [
  { emoji: '⚡', label: 'Départ rapide' },
  { emoji: '🛡️', label: 'Assuré' },
  { emoji: '⭐', label: 'Noté 4.8/5' },
  { emoji: '🎁', label: 'Bonus fidélité' },
  { emoji: '📍', label: 'Suivi live' },
  { emoji: '💬', label: 'Support 24/7' },
];

// ─────────────────────────────────────────────────────────────
export function SmartCabbPromoSection() {
  const { setCurrentScreen } = useAppState();
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-slide
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveSlide(s => (s + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goTo = (i: number) => {
    setActiveSlide(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide(s => (s + 1) % HERO_SLIDES.length);
    }, 4000);
  };

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className="space-y-4 pt-1">

      {/* ── Séparateur avec titre ─────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SmartCabb</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* ── PILLS AVANTAGES RAPIDES ───────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
        {QUICK_PERKS.map(p => (
          <div
            key={p.label}
            className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 flex-shrink-0"
          >
            <span className="text-sm">{p.emoji}</span>
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">{p.label}</span>
          </div>
        ))}
      </div>

      {/* ── HERO CAROUSEL BANNER ──────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ height: 148 }}>
        {/* Image de fond */}
        <img
          src={slide.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
        />
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${slide.bg} opacity-85 transition-all duration-700`} />

        {/* Contenu */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full mb-1.5 ${slide.tagColor}`}>
                {slide.badge}
              </div>
              <h3 className="text-white font-black text-xl leading-tight">{slide.title}</h3>
              <p className="text-white/85 text-xs mt-0.5">{slide.subtitle}</p>
            </div>
            {/* Logo SmartCabb */}
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 flex-shrink-0">
              <span className="text-white font-black text-[10px] leading-none text-center">SC</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* CTA */}
            <button
              onClick={() => {
                if (slide.screen) {
                  try { setCurrentScreen(slide.screen as any); } catch {}
                }
              }}
              className="bg-white/25 backdrop-blur-sm border border-white/40 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-white/35 transition-all active:scale-95"
            >
              {slide.cta} →
            </button>

            {/* Dots */}
            <div className="flex gap-1.5">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all ${i === activeSlide ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TITRE SECTION DÉCOUVERTE ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Découvrez SmartCabb</h3>
        <a
          href="https://smartcabb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          En savoir plus →
        </a>
      </div>

      {/* ── GRILLE FEATURE CARDS (style Yango) ───────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {FEATURE_CARDS.map(card => (
          card.isLink ? (
            <a
              key={card.id}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform"
              style={{ height: 100 }}
            >
              <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              <div className="relative z-10 h-full flex flex-col justify-between p-3">
                <p className="text-white font-black text-sm leading-tight whitespace-pre-line">{card.title}</p>
                <div className="flex items-center gap-1">
                  <span className="text-white/80 text-[9px]">{card.desc}</span>
                  <span className="text-white text-[9px]">↗</span>
                </div>
              </div>
            </a>
          ) : (
            <div
              key={card.id}
              className="relative rounded-2xl overflow-hidden shadow-md"
              style={{ height: 100 }}
            >
              <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              <div className="relative z-10 h-full flex flex-col justify-between p-3">
                <p className="text-white font-black text-sm leading-tight whitespace-pre-line">{card.title}</p>
                <p className="text-white/80 text-[9px]">{card.desc}</p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* ── BANNIÈRE LIEN SITE VITRINE ────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 p-4 flex items-center justify-between shadow-lg">
        {/* Éléments déco */}
        <div className="absolute right-0 top-0 w-32 h-full opacity-10">
          <div className="w-32 h-32 bg-blue-400 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-base leading-tight">SmartCabb.com</p>
          <p className="text-white/60 text-xs mt-0.5">Découvrez notre vision du transport à Kinshasa</p>
        </div>
        <a
          href="https://smartcabb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 bg-white text-gray-900 text-xs font-black px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors active:scale-95"
        >
          Visiter →
        </a>
      </div>

      {/* ── FOOTER LÉGAL ─────────────────────────────────────── */}
      <p className="text-[9px] text-center text-gray-300 pb-2">
        SmartCabb © 2025 · Kinshasa, RDC · Transport connecté & sécurisé
      </p>
    </div>
  );
}
