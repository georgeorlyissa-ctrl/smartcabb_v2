import { useState, useEffect } from 'react';
import { useLocation } from '../lib/simple-router';
import { useAppState } from '../hooks/useAppState';

/**
 * Composant de débogage visuel
 * Affiche l'état de l'application en overlay sur mobile
 */
export function VisualDebug() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const location = useLocation();
  const { state } = useAppState();

  // Ajouter un log
  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log('📱 VISUAL DEBUG:', message);
  };

  useEffect(() => {
    addLog(`Location: ${location.pathname}`);
    addLog(`Screen: ${state.currentScreen || 'undefined'}`);
    addLog(`View: ${state.currentView || 'undefined'}`);
    addLog(`User: ${state.currentUser?.name || 'none'}`);
  }, [location.pathname, state.currentScreen, state.currentView, state.currentUser]);

  // Triple tap pour afficher/masquer
  const [tapCount, setTapCount] = useState(0);
  useEffect(() => {
    const handleTouch = () => {
      setTapCount(prev => prev + 1);
      setTimeout(() => setTapCount(0), 1000);
    };

    window.addEventListener('touchstart', handleTouch);
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  useEffect(() => {
    if (tapCount >= 3) {
      setIsVisible(prev => !prev);
      setTapCount(0);
    }
  }, [tapCount]);

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 200, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          zIndex: 999999,
          cursor: 'pointer',
          border: '2px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        onClick={() => setIsVisible(true)}
      >
        🐛
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '20px',
        zIndex: 999999,
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#00ff00', margin: 0 }}>🐛 VISUAL DEBUG</h2>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff0000',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          FERMER
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(0, 255, 0, 0.1)', borderRadius: '8px' }}>
        <div><strong>📍 URL:</strong> {window.location.href}</div>
        <div><strong>📁 Pathname:</strong> {location.pathname}</div>
        <div><strong>📺 Screen:</strong> {state.currentScreen || '❌ undefined'}</div>
        <div><strong>👁️ View:</strong> {state.currentView || '❌ undefined'}</div>
        <div><strong>👤 User:</strong> {state.currentUser?.name || '❌ none'}</div>
        <div><strong>🚗 Driver:</strong> {state.currentDriver?.name || '❌ none'}</div>
        <div><strong>📱 User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ffff00', marginBottom: '10px' }}>📜 LOGS (derniers 20)</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '10px', borderRadius: '8px' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '5px', borderBottom: '1px solid rgba(0, 255, 0, 0.2)', paddingBottom: '5px' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ color: '#ffff00', marginBottom: '10px' }}>🔧 ACTIONS</h3>
        <button
          onClick={() => {
            addLog('🔄 Reloading page...');
            window.location.reload();
          }}
          style={{
            padding: '15px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '10px',
          }}
        >
          🔄 RECHARGER LA PAGE
        </button>

        <button
          onClick={() => {
            addLog('🗑️ Clearing localStorage...');
            localStorage.clear();
            addLog('✅ localStorage cleared');
          }}
          style={{
            padding: '15px',
            backgroundColor: '#cc6600',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '10px',
          }}
        >
          🗑️ VIDER LOCALSTORAGE
        </button>

        <button
          onClick={async () => {
            addLog('🧨 Unregistering Service Worker...');
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
                addLog('✅ SW unregistered');
              }
            }
          }}
          style={{
            padding: '15px',
            backgroundColor: '#cc0000',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          🧨 DÉSINSTALLER SERVICE WORKER
        </button>
      </div>
    </div>
  );
}
