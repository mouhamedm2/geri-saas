/**
 * GÉRI — Service Worker
 * Mode hors ligne complet : cache toutes les ressources essentielles
 * Stratégie : Cache First pour les assets, Network First pour les données
 */

const CACHE_NAME     = 'geri-v1.0.0';
const CACHE_DYNAMIC  = 'geri-dynamic-v1';

// Ressources à mettre en cache immédiatement à l'installation
const ASSETS_ESSENTIELS = [
  '/',
  '/app.html',
  '/auth.html',
  '/index.html',
  '/paiement.html',
  '/employe.html',
  '/logo.svg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// ════════════════════════════════════════
// INSTALLATION
// ════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des ressources essentielles');
      // Mettre en cache les ressources locales seulement
      // (les CDN externes peuvent échouer)
      return Promise.allSettled(
        ASSETS_ESSENTIELS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Impossible de cacher:', url, err.message)
          )
        )
      );
    })
  );

  // Activer immédiatement sans attendre l'ancienne version
  self.skipWaiting();
});

// ════════════════════════════════════════
// ACTIVATION
// ════════════════════════════════════════

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== CACHE_DYNAMIC)
          .map(name => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// ════════════════════════════════════════
// INTERCEPTION DES REQUÊTES
// ════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes Supabase (données en temps réel)
  if (url.hostname.includes('supabase.co')) return;

  // Ignorer les extensions Chrome
  if (url.protocol === 'chrome-extension:') return;

  // Stratégie selon le type de ressource
  if (_estAssetStatique(url)) {
    // Cache First : HTML, CSS, JS, images → cache d'abord
    event.respondWith(_cacheFirst(request));
  } else {
    // Network First : autres → réseau d'abord, cache en fallback
    event.respondWith(_networkFirst(request));
  }
});

// ════════════════════════════════════════
// STRATÉGIES DE CACHE
// ════════════════════════════════════════

/**
 * Cache First — ressources statiques
 * Retourne depuis le cache si disponible, sinon va sur le réseau
 */
async function _cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return _pageFallback(request);
  }
}

/**
 * Network First — ressources dynamiques
 * Essaie le réseau, bascule sur le cache en cas d'échec
 */
async function _networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || _pageFallback(request);
  }
}

/**
 * Page de fallback hors ligne
 */
function _pageFallback(request) {
  const url = new URL(request.url);

  // Retourner app.html pour toutes les pages de l'app
  if (url.pathname.includes('app') || url.pathname === '/') {
    return caches.match('/app.html');
  }

  // Page hors ligne générique
  return new Response(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Géri — Hors ligne</title>
      <style>
        body {
          font-family: 'DM Sans', sans-serif;
          background: #0A1628;
          color: #F7F4EE;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          text-align: center;
          padding: 24px;
        }
        .icon { font-size: 56px; margin-bottom: 16px; }
        h1 { font-size: 22px; font-weight: 800; color: #00C896; margin-bottom: 8px; }
        p { font-size: 14px; color: rgba(247,244,238,0.6); line-height: 1.6; }
        button {
          margin-top: 24px;
          background: #00C896;
          color: #0A1628;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div>
        <div class="icon">📡</div>
        <h1>Vous êtes hors ligne</h1>
        <p>Géri fonctionne hors ligne.<br>Vos données locales sont disponibles.</p>
        <button onclick="window.location.href='/app.html'">Ouvrir l'application</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ════════════════════════════════════════
// UTILITAIRES
// ════════════════════════════════════════

function _estAssetStatique(url) {
  const extensionsStatiques = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return extensionsStatiques.some(ext => url.pathname.endsWith(ext));
}

// ════════════════════════════════════════
// SYNC EN ARRIÈRE-PLAN (quand la connexion revient)
// ════════════════════════════════════════

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ventes') {
    console.log('[SW] Synchronisation des ventes en attente...');
    event.waitUntil(_syncDonneesEnAttente());
  }
});

async function _syncDonneesEnAttente() {
  // La synchronisation réelle se fait dans app.html via Supabase
  // Le SW notifie juste l'app que la connexion est revenue
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'CONNEXION_RETABLIE' });
  });
}

// ════════════════════════════════════════
// NOTIFICATIONS PUSH (future intégration)
// ════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || 'Géri', {
      body:  data.body  || '',
      icon:  '/logo.svg',
      badge: '/logo.svg',
      data:  data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/app.html')
  );
});
