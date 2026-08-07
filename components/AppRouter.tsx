import { Routes, Route, Navigate, useNavigate } from '../lib/simple-router';
import { useEffect, Suspense, lazy, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { SplashScreen } from './SplashScreen';

// Applications principales — chargées à la demande pendant le splash (démarrage fluide)
const LandingScreen = lazy(() => import('./LandingScreen').then(m => ({ default: m.LandingScreen })));
const PassengerApp = lazy(() => import('../pages/PassengerApp').then(m => ({ default: m.PassengerApp })));
const DriverApp = lazy(() => import('../pages/DriverApp').then(m => ({ default: m.DriverApp })));
const AdminApp = lazy(() => import('../pages/AdminApp').then(m => ({ default: m.AdminApp })));

/**
 * AppRouter - Routeur principal pour /app/*
 * Gère la landing page et les 3 applications (Passager, Conducteur, Admin)
 * 🔥 v517.33 - FIX: Redirection optimisée sans double render
 * ✨ SplashScreen 2 phases (logo → slogan) affiché à chaque ouverture
 */
export function AppRouter() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Si l'utilisateur arrive sur /app sans sous-route, le rediriger vers la landing
    if (currentPath === '/app' || currentPath === '/app/') {
      console.log('🔀 AppRouter: Redirection /app → /app/landing');
      navigate('/app/landing', { replace: true });
    }
  }, []); // Dépendances vides pour n'exécuter qu'une fois

  // ✨ Splash au démarrage (une fois par chargement, comme Yango)
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
        <LoadingScreen />
      </div>
    }>
      <Routes>
        {/* Landing Page - Sélection du type d'utilisateur */}
        <Route path="/app/landing" element={<LandingScreen />} />
        
        {/* Application Passager */}
        <Route path="/app/passenger/*" element={<PassengerApp />} />
        
        {/* Application Conducteur */}
        <Route path="/app/driver/*" element={<DriverApp />} />
        
        {/* Panel Admin */}
        <Route path="/app/admin/*" element={<AdminApp />} />
        
        {/* Redirection par défaut */}
        <Route path="/app/*" element={<Navigate to="/app/landing" replace />} />
      </Routes>
    </Suspense>
  );
}