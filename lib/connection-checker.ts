/**
 * Utilitaire pour vérifier et diagnostiquer les connexions
 * (Géolocalisation, Supabase, Internet)
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Vérifie la disponibilité de la géolocalisation
 */
export async function checkGeolocation(): Promise<{
  available: boolean;
  error?: string;
  position?: { lat: number; lng: number };
}> {
  // 🛡️ PROTECTION 1: Vérifier si navigator.geolocation existe
  if (!navigator.geolocation) {
    console.log('📍 Géolocalisation non supportée - Position par défaut RDC');
    return {
      available: false,
      error: 'Géolocalisation non supportée dans ce navigateur'
    };
  }

  // 🛡️ PROTECTION 2: Vérifier si on est dans un iframe avec Permissions Policy
  try {
    if (window.self !== window.top) {
      console.log('📍 Iframe détecté - GPS peut être bloqué par Permissions Policy');
      // Dans un iframe, ne pas tenter d'accéder au GPS
      return {
        available: false,
        error: 'GPS bloqué dans iframe - Position Kinshasa utilisée'
      };
    }
  } catch (e) {
    // Si on ne peut pas vérifier (iframe cross-origin), assumer qu'on est bloqué
    console.log('📍 Impossible de vérifier iframe - GPS probablement bloqué');
    return {
      available: false,
      error: 'GPS bloqué par Permissions Policy - Position Kinshasa utilisée'
    };
  }

  // 🛡️ PROTECTION 3: Vérifier les Permissions API si disponible
  try {
    if ('permissions' in navigator) {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      console.log('🔐 Statut permission géolocalisation:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        console.log('📍 Permission GPS refusée - Position Kinshasa par défaut');
        return {
          available: false,
          error: 'Permission refusée - Position Kinshasa utilisée'
        };
      }
    }
  } catch (permError) {
    console.log('⚠️ Impossible de vérifier permissions:', permError);
    // Continue quand même, on va essayer getCurrentPosition
  }

  // 🛡️ PROTECTION 4: Try-catch pour attraper les erreurs synchrones (Permissions Policy)
  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Géolocalisation réussie:', position.coords.latitude, position.coords.longitude);
          resolve({
            available: true,
            position: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          let errorMsg = 'GPS bloqué - Position Kinshasa utilisée';
          
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Permission refusée - Position Kinshasa utilisée';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'Position non disponible - Position Kinshasa utilisée';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Timeout GPS - Position Kinshasa utilisée';
          }
          
          console.log('📍 Erreur GPS:', errorMsg);
          resolve({
            available: false,
            error: errorMsg
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } catch (syncError: any) {
      // 🔥 ATTRAPE LES ERREURS SYNCHRONES (Permissions Policy, etc.)
      console.log('📍 Erreur synchrone GPS (Permissions Policy):', syncError.message);
      resolve({
        available: false,
        error: 'GPS bloqué par Permissions Policy - Position Kinshasa utilisée'
      });
    }
  });
}

/**
 * Vérifie la connexion à Supabase
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    const url = `https://${projectId}.supabase.co/rest/v1/`;
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok || response.status === 404) {
      // 404 est OK car nous testons juste la connectivité
      return {
        connected: true,
        latency
      };
    }
    
    return {
      connected: false,
      error: `Erreur HTTP ${response.status}`
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    };
  }
}

/**
 * Vérifie la connexion Internet
 */
export async function checkInternetConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    // Essayer de se connecter à plusieurs services
    const urls = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://1.1.1.1'
    ];
    
    const promises = urls.map(url => 
      fetch(url, { 
        mode: 'no-cors',
        cache: 'no-cache'
      }).then(() => true).catch(() => false)
    );
    
    const results = await Promise.all(promises);
    const connected = results.some(r => r === true);
    
    if (connected) {
      return { connected: true };
    }
    
    return {
      connected: false,
      error: 'Pas de connexion Internet détectée'
    };
  } catch (error) {
    return {
      connected: false,
      error: 'Impossible de vérifier la connexion Internet'
    };
  }
}

/**
 * Vérifie si le protocole est sécurisé (HTTPS ou localhost)
 */
export function checkSecureContext(): {
  secure: boolean;
  protocol: string;
  warning?: string;
} {
  const isSecure = window.isSecureContext;
  const protocol = window.location.protocol;
  
  if (isSecure) {
    return {
      secure: true,
      protocol
    };
  }
  
  return {
    secure: false,
    protocol,
    warning: 'Contexte non sécurisé - La géolocalisation peut être bloquée'
  };
}

/**
 * Obtient une position par défaut (centre de Kinshasa)
 */
export function getDefaultPosition(): { lat: number; lng: number; address: string } {
  return {
    lat: -4.3276,
    lng: 15.3136,
    address: 'Centre de Kinshasa (position par défaut)'
  };
}

/**
 * Diagnostic complet de l'application
 */
export async function runFullDiagnostic(): Promise<{
  geolocation: Awaited<ReturnType<typeof checkGeolocation>>;
  supabase: Awaited<ReturnType<typeof checkSupabaseConnection>>;
  internet: Awaited<ReturnType<typeof checkInternetConnection>>;
  secureContext: ReturnType<typeof checkSecureContext>;
  timestamp: Date;
}> {
  const [geolocation, supabase, internet] = await Promise.all([
    checkGeolocation(),
    checkSupabaseConnection(),
    checkInternetConnection()
  ]);
  
  const secureContext = checkSecureContext();
  
  const diagnostic = {
    geolocation,
    supabase,
    internet,
    secureContext,
    timestamp: new Date()
  };
  
  // Logger le diagnostic
  console.log('🔍 Diagnostic SmartCabb:', diagnostic);
  
  return diagnostic;
}

/**
 * Affiche un message d'erreur utilisateur convivial
 */
export function getErrorMessage(diagnostic: Awaited<ReturnType<typeof runFullDiagnostic>>): string {
  const errors: string[] = [];
  
  if (!diagnostic.internet.connected) {
    errors.push('❌ Pas de connexion Internet');
  }
  
  if (!diagnostic.supabase.connected) {
    errors.push('❌ Impossible de se connecter à Supabase');
  }
  
  if (!diagnostic.geolocation.available) {
    errors.push(`⚠️ ${diagnostic.geolocation.error}`);
  }
  
  if (!diagnostic.secureContext.secure) {
    errors.push('⚠️ Contexte non sécurisé (utilisez HTTPS)');
  }
  
  if (errors.length === 0) {
    return '✅ Tout fonctionne correctement';
  }
  
  return errors.join('\n');
}

/**
 * Affiche les suggestions de correction
 */
export function getSuggestions(diagnostic: Awaited<ReturnType<typeof runFullDiagnostic>>): string[] {
  const suggestions: string[] = [];
  
  if (!diagnostic.internet.connected) {
    suggestions.push('Vérifiez votre connexion Internet');
  }
  
  if (!diagnostic.supabase.connected) {
    suggestions.push('Vérifiez les credentials Supabase dans .env');
    suggestions.push('Videz le cache du navigateur (Ctrl+Shift+Delete)');
    suggestions.push('Désinstallez les Service Workers');
  }
  
  if (!diagnostic.geolocation.available) {
    suggestions.push('Autorisez la géolocalisation dans votre navigateur (cliquez sur 🔒 dans la barre d\'adresse)');
    if (!diagnostic.secureContext.secure) {
      suggestions.push('Utilisez HTTPS ou localhost pour la géolocalisation');
    }
  }
  
  return suggestions;
}