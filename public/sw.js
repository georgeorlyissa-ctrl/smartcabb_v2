/**
 * 🚀 SERVICE WORKER v517.37 - OFFLINE + DYNAMIC MODULES
 * 
 * STRATÉGIE OFFLINE-FIRST :
 * 1. Cache précaching (index.html + assets critiques)
 * 2. Cache-first pour assets statiques
 * 3. Network-first avec fallback pour API
 * 4. Cache automatique des modules JS dynamiques
 * 5. Page offline personnalisée
 */

const CACHE_VERSION = 'smartcabb-v517-37-modules';
const STATIC_CACHE = 'smartcabb-static-v517-37';
const RUNTIME_CACHE = 'smartcabb-runtime-v517-37';
const DYNAMIC_MODULES_CACHE = 'smartcabb-modules-v517-37';

console.log('🚀 Service Worker v517.37 - OFFLINE + DYNAMIC MODULES');

// Assets critiques à précacher
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation: Précacher les assets critiques
self.addEventListener('install', (event) => {
  console.log('✅ SW v517.37: Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION);
        
        // Précacher les URLs critiques
        await Promise.all(
          PRECACHE_URLS.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('✅ Précaché:', url);
              }
            } catch (error) {
              console.warn('⚠️ Échec précache:', url, error);
            }
          })
        );
        
        console.log('✅ SW v517.37: Précaching terminé');
      } catch (error) {
        console.error('❌ Erreur installation SW:', error);
      }
      
      // Activer immédiatement
      self.skipWaiting();
    })()
  );
});

// Activation: Nettoyer les vieux caches
self.addEventListener('activate', (event) => {
  console.log('✅ SW v517.37: Activating...');
  
  event.waitUntil(
    (async () => {
      // Nettoyer les vieux caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => 
            name !== CACHE_VERSION && 
            name !== STATIC_CACHE && 
            name !== RUNTIME_CACHE &&
            name !== DYNAMIC_MODULES_CACHE
          )
          .map(name => {
            console.log('🗑️ Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
      
      // Prendre contrôle immédiatement
      await clients.claim();
      console.log('✅ SW v517.37: Active and controlling all clients');
    })()
  );
});

// Fetch: Stratégie intelligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes externes (sauf assets)
  if (url.origin !== self.location.origin && !isAsset(url)) {
    return;
  }
  
  // Ignorer les requêtes Supabase (toujours network)
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Vous êtes hors ligne' }), 
          { 
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }
  
  // Stratégie selon le type de ressource
  if (isNavigationRequest(request)) {
    // HTML: Cache-first avec fallback
    event.respondWith(handleNavigationRequest(request));
  } else if (isAsset(url)) {
    // Assets: Cache-first
    event.respondWith(handleAssetRequest(request));
  } else {
    // Tout le reste: Network-first avec cache fallback
    event.respondWith(handleRuntimeRequest(request));
  }
});

// Vérifier si c'est une requête de navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Vérifier si c'est un asset statique
function isAsset(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|css|js|json)$/i);
}

// Gérer les requêtes de navigation (HTML)
// ✅ Network-first : le HTML frais référence toujours le bon bundle JS.
// Sinon l'iPhone reste bloqué sur un vieux index-*.js en cache.
async function handleNavigationRequest(request) {
  try {
    // Réseau d'abord
    const response = await fetch(request);

    if (response.ok) {
      // Mettre en cache pour le mode hors ligne
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('⚠️ Navigation hors ligne:', request.url);

    // Fallback: cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fallback: retourner index.html du cache
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // Dernière option: page offline minimale
    return new Response(
      getOfflinePage(),
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 503
      }
    );
  }
}

// Gérer les assets statiques
async function handleAssetRequest(request) {
  try {
    // Cache-first
    const cached = await caches.match(request);
    if (cached) {
      console.log('📦 Asset depuis cache:', request.url);
      return cached;
    }
    
    // Sinon, fetch et mettre en cache
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('⚠️ Asset non disponible hors ligne:', request.url);
    
    // Fallback pour images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial" font-size="14">Image non disponible</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Gérer les requêtes runtime (API, etc.)
async function handleRuntimeRequest(request) {
  try {
    // Network-first
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback sur le cache
    const cached = await caches.match(request);
    if (cached) {
      console.log('📦 Runtime depuis cache:', request.url);
      return cached;
    }
    
    throw error;
  }
}

// Page offline minimale
function getOfflinePage() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartCabb - Hors ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #ecfeff 0%, #ffffff 50%, #f0fdf4 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 900;
      color: white;
    }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 12px;
    }
    p {
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
      opacity: 0.5;
    }
    .retry-btn {
      background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .retry-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">SC</div>
    <div class="icon">📡</div>
    <div class="status">
      <span>⚠️</span>
      <span>Vous êtes hors ligne</span>
    </div>
    <h1>SmartCabb</h1>
    <p>L'application fonctionne en mode hors ligne, mais certaines fonctionnalités nécessitent une connexion Internet.</p>
    <button class="retry-btn" onclick="window.location.reload()">
      Réessayer
    </button>
  </div>
  
  <script>
    // Recharger automatiquement quand la connexion revient
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>
  `.trim();
}

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => {
        return Promise.all(keys.map(key => caches.delete(key)));
      })
    );
  }
});

console.log('✅ SW v517.37: Ready and offline-capable');