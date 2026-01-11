const CACHE_NAME = 'nfl-bracket-v1';
const ASSETS = [
    './',                 // Relative path for root
    './index.html',       // Relative path
    './manifest.json',    // Relative path
    './css/style.css',    // Relative path
    './js/main.js',       // Relative path
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});