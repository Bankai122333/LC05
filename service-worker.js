// Name of the cache
const CACHE_NAME = 'lc05-certificate-cache-v1';

// Files to cache for offline use
const filesToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/nr-logo.png', // Include the Network Rail logo
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Install event - cache files when service worker is installed
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(filesToCache);
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached file if it exists
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Add new responses to cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                            
                        return response;
                    })
                    .catch(() => {
                        // If both cache and network fail, show offline message
                        if (event.request.mode === 'navigate') {
                            return new Response(
                                '<html><body style="font-family: sans-serif; padding: 20px;">' +
                                '<h1 style="color: #002f6c;">LC05 Temporary Trading Certificate</h1>' +
                                '<p>You are currently offline. Please reconnect to access all features.</p>' +
                                '<p>If you have previously loaded the app, your saved forms should still be accessible.</p>' +
                                '</body></html>', 
                                {
                                    headers: { 'Content-Type': 'text/html' }
                                }
                            );
                        }
                    });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim clients so the service worker is in control without reload
    return self.clients.claim();
});

// Message event - handle messages from the main script
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});