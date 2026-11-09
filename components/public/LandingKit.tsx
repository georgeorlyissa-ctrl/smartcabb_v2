/**
 * 🎨 KIT VISUEL DES PAGES PUBLIQUES — SmartCabb
 *
 * Styles et hook de révélation partagés par les pages de conversion
 * (`/commander`, `/reserver`) afin de rester cohérents avec les pages
 * `ServicesPage` et `DriversLandingPage`.
 *
 * @version 1.0.0
 */

import { useEffect, useRef, useState } from 'react';

export const SITE_BLUE = '#007AFF';
export const SITE_NAVY = '#0B1F33';

/** Détecte l'entrée d'un bloc dans le viewport (une seule fois). */
export function useInViewCustom(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Feuille de style commune (classes préfixées `lk-`). */
export function LandingKitStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
      * { font-family: 'Inter', sans-serif !important; }

      .lk-accent {
        height: 4px; width: 64px;
        background: linear-gradient(90deg, ${SITE_BLUE}, ${SITE_NAVY});
        border-radius: 2px; margin-bottom: 20px;
      }
      .lk-accent.center { margin-left: auto; margin-right: auto; }

      .lk-reveal {
        opacity: 0; transform: translateY(34px);
        transition: opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1);
      }
      .lk-reveal.in { opacity: 1; transform: none; }
      .lk-d0 { transition-delay: 0s; }
      .lk-d1 { transition-delay: .07s; }
      .lk-d2 { transition-delay: .14s; }
      .lk-d3 { transition-delay: .21s; }
      .lk-d4 { transition-delay: .28s; }
      .lk-d5 { transition-delay: .36s; }
      .lk-d6 { transition-delay: .44s; }

      .lk-card {
        background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
        transition: all .3s cubic-bezier(.22,1,.36,1);
      }
      .lk-card:hover {
        border-color: ${SITE_BLUE};
        box-shadow: 0 14px 40px rgba(0,122,255,.12);
        transform: translateY(-5px);
      }

      .lk-step {
        background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
        padding: 32px 24px; position: relative; text-align: center;
        transition: all .3s cubic-bezier(.22,1,.36,1);
      }
      .lk-step:hover { border-color: ${SITE_BLUE}; box-shadow: 0 14px 40px rgba(0,122,255,.12); }

      .lk-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 14px 28px; background: ${SITE_BLUE}; color: #fff;
        font-weight: 800; font-size: 15px; border-radius: 10px;
        text-decoration: none; transition: all .2s;
        box-shadow: 0 8px 22px rgba(0,122,255,.28);
      }
      .lk-btn:hover { background: #0066d6; transform: translateY(-1px); }

      .lk-btn-outline {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 13px 26px; background: #fff; color: ${SITE_BLUE};
        font-weight: 800; font-size: 15px; border-radius: 10px;
        border: 2px solid ${SITE_BLUE}; text-decoration: none; transition: all .2s;
      }
      .lk-btn-outline:hover { background: #EAF3FF; }

      .lk-btn-light {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 15px 34px; background: #fff; color: ${SITE_BLUE};
        font-weight: 800; font-size: 16px; border-radius: 10px;
        text-decoration: none; transition: all .2s;
      }
      .lk-btn-light:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,.18); }

      .lk-tag {
        font-size: 12px; font-weight: 700; color: ${SITE_BLUE};
        background: #EAF3FF; border: 1px solid #bae6fd;
        border-radius: 999px; padding: 7px 14px;
      }

      @keyframes lkPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(0,122,255,.4); }
        50% { box-shadow: 0 0 0 14px rgba(0,122,255,0); }
      }
      .lk-glow { animation: lkPulse 2.5s ease infinite; }

      .lk-faq summary { cursor: pointer; list-style: none; }
      .lk-faq summary::-webkit-details-marker { display: none; }
      .lk-faq[open] .lk-faq-chevron { transform: rotate(180deg); }

      @media (max-width: 640px) {
        .lk-btn, .lk-btn-outline { width: 100%; }
      }
    `}</style>
  );
}
