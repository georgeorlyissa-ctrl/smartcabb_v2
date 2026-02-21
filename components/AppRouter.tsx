import { Routes, Route, Navigate, useNavigate } from '../lib/simple-router';
import { useEffect, Suspense } from 'react';
import { LoadingScreen } from './LoadingScreen';

// Applications principales - Import direct pour fiabilité
import { LandingScreen } from './LandingScreen';
import { PassengerApp } from '../pages/PassengerApp';
import { DriverApp } from '../pages/DriverApp';
import { AdminApp } from '../pages/AdminApp';

/**
 * AppRouter - Routeur principal pour /app/*
 * Gère la landing page et les 3 applications (Passager, Conducteur, Admin)
 * 🔥 v517.33 - FIX: Redirection optimisée sans double render
 */
export function AppRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Si l'utilisateur arrive sur /app sans sous-route, le rediriger vers la landing
    if (currentPath === '/app' || currentPath === '/app/') {
      console.log('🔀 AppRouter: Redirection /app → /app/landing');
      navigate('/app/landing', { replace: true });
    }
  }, []); // Dépendances vides pour n'exécuter qu'une fois

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