import { ReactNode } from 'react';
import { motion } from '../lib/motion';

const NAVY = '#0B1F33';

interface PageHeroProps {
  image: string;
  fallbackImage?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  minHeight?: string;
}

/**
 * Hero photo plein écran partagé (toutes les pages sauf le landing) :
 * photo + overlay navy + titre blanc + contenu optionnel (CTA, stats).
 */
export function PageHero({ image, fallbackImage, title, subtitle, children, minHeight = '560px' }: PageHeroProps) {
  return (
    <section style={{ position: 'relative', minHeight, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
      <img
        src={image}
        alt=""
        onError={e => { if (fallbackImage) e.currentTarget.src = fallbackImage; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(7,20,32,0.25) 0%, rgba(7,20,32,0.55) 55%, ${NAVY} 100%)` }} />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full" style={{ paddingTop: '140px', paddingBottom: '56px' }}>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(36px,5vw,60px)', fontWeight: '900', lineHeight: '1.05', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '17px', lineHeight: '1.7', maxWidth: '540px', marginBottom: children ? '32px' : 0 }}>
              {subtitle}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
