// ======================================================
// A. CONFIGURACIÓN INICIAL
// ======================================================
const CACHE_NAME = 'cocktail-pwa-v2';

// 1. Recursos del App Shell (Cache Only)
const appShellAssets = [
    './',
    './index.html',
    './main.js',
    './styles/main.css',
    './scripts/app.js',
    './styles/200x300.svg',
    './images/icons/192.png',
    './images/icons/512.png',
    './manifest.json'
];

// 2. JSON de Fallback para la API (usado cuando la red falla)
const OFFLINE_COCKTAIL_JSON = {
    drinks: [{
        idDrink: "00000",
        strDrink: "🚫 ¡Sin Conexión ni Datos Frescos!",
        strTags: "FALLBACK",
        strCategory: "Desconectado",
        strInstructions: "No pudimos obtener resultados en este momento. Este es un resultado GENÉRICO para demostrar que la aplicación NO SE ROMPE. Intenta conectarte de nuevo.",
        strDrinkThumb: "./styles/200x300.svg", // Imagen local de fallback
        strIngredient1: "Servicio Worker",
        strIngredient2: "Fallback JSON"
    }]
};

// ======================================================
// B. CICLO DE VIDA: INSTALACIÓN (PRECACHE)
// ======================================================
self.addEventListener('install', event => {
    console.log('[SW] ⚙️ Instalando y precacheando el App Shell...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // 1. Precacheo: Guardamos el App Shell
            return cache.addAll(appShellAssets);
        })
            .then(() => self.skipWaiting()) // Forzamos la activación
    );
});
self.addEventListener('activate', event => {
    console.log('[SW] 🚀 Service Worker Activado.');
    // Opcional: Limpieza de cachés antiguas aquí
    event.waitUntil(self.clients.claim());
});

// ======================================================
// C. CICLO DE VIDA: FETCH (ESTRATEGIAS)
// ======================================================
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    // --- ESTRATEGIA 1: CACHE ONLY (para el App Shell) ---
    const isAppShellRequest = (
        requestUrl.origin === self.location.origin && // Mismo origen
        appShellAssets.some(asset => // Coincide con algún recurso del App Shell
            requestUrl.pathname.endsWith(asset.replace('./', '')) // Ajuste para rutas relativas
        )
    );
    if (isAppShellRequest) {
        console.log(`[SW] 🔒 App Shell: CACHE ONLY para ${requestUrl.pathname}`);
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Devolvemos la respuesta de caché o un error 500 si falta el archivo
                    return response || new Response('App Shell Asset Missing', { status: 500 });z
                })
        );
        return;
    }
    // --- ESTRATEGIA 2: NETWORK-FIRST con FALLBACK de JSON (para la API)
    if (requestUrl.host === 'www.thecocktaildb.com' && requestUrl.pathname.includes('/search.php')) {
        console.log('[SW] 🔄 API: NETWORK-FIRST con Fallback a JSON Genérico.');
        event.respondWith(
            fetch(event.request) // Intentamos ir a la red primero
                .catch(() => {
                    // Si la RED FALLA, devolvemos el JSON de Fallback.
                    console.log('[SW] ❌ Fallo de red. Devolviendo JSON de Fallback.');
                    return new Response(JSON.stringify(OFFLINE_COCKTAIL_JSON), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }
    // Para todos los demás recursos (imágenes de la API, otros scripts),
    // se utiliza el comportamiento por defecto (ir a la red).
});