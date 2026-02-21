import { useEffect } from 'react';
import * as React from 'react';

export function AdminDiagnostic() {
  useEffect(() => {
    console.log('🔍 Diagnostic AdminApp:');
    console.log('- React version:', React.version);
    console.log('- React.Component:', typeof React.Component);
    console.log('- window.React:', typeof (window as any).React);
    
    // Vérifier si React.Component est une fonction
    if (typeof React.Component !== 'function') {
      console.error('❌ React.Component n\'est pas une fonction!');
    } else {
      console.log('✅ React.Component est une fonction');
    }
    
    // Test de création d'un Error Boundary
    try {
      class TestBoundary extends React.Component {
        render() {
          return null;
        }
      }
      console.log('✅ Test Error Boundary réussi');
    } catch (e) {
      console.error('❌ Test Error Boundary échoué:', e);
    }
  }, []);
  
  return null;
}
