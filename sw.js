// Bump this version to v13 (or higher) to force the update
const CACHE_NAME = 'nfl-bracket-v20';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/main.js',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// 1. INSTALL: Cache files and tell browser to NOT wait
self.addEventListener('install', (e) => {
    self.skipWaiting(); // <--- Forces this new SW to become active immediately
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// 2. ACTIVATE: Delete old caches (v1, v2, etc.) to save space
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key); // Delete old version
                    }
                })
            );
        }).then(() => self.clients.claim()) // <--- Take control of all open app windows instantly
    );
});

// 3. FETCH: Serve from Cache
self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});