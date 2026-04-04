import { useEffect } from 'react';
import { useLocation } from '../lib/simple-router';

/**
 * 🔝 Composant qui scroll automatiquement en haut de la page
 * lors de chaque changement de route
 */
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Scroll fluide vers le haut à chaque changement de route
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // ✅ Scroll fluide au lieu d'instantané
    });
    
    console.log('🔝 Scroll vers le haut - Route:', location.pathname);
  }, [location.pathname]);

  return null;
}
