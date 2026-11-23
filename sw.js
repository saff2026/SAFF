// Minimal service worker for PWA installability + offline shell.
// Caches static assets; never intercepts cross-origin requests
// (so Firebase Realtime DB / Google Fonts work normally).
var CACHE = 'wc2026-v49';
var ASSETS = [
  './',
  './index.html',
  './saff-ar.html',
  './volley.html',
  './gulf27.html',
  './manifest-en.json',
  './manifest-ar.json',
  './manifest-volley.json',
  './manifest-gulf.json',
  './icon-en-192.png',
  './icon-en-512.png',
  './icon-saff-192.png',
  './icon-saff-512.png',
  './icon-volley-192.png',
  './icon-volley-512.png',
  './icon-gulf-192.png',
  './icon-gulf-512.png',
  './gulf27-trophy.png',
  './prize-jersey.png',
  './gulf27-logo.png',
  './wc26.png',
  './saff-white.png',
  './logo-dark.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(a){
        return c.add(a).catch(function(){/* ignore missing */});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  // do not intercept cross-origin (Firebase, Google Fonts, gstatic, etc.)
  if(url.origin !== self.location.origin) return;
  // network-first for HTML navigations -> always get fresh content when online
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(r){
        var cp = r.clone();
        caches.open(CACHE).then(function(c){ c.put(req, cp); });
        return r;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  // cache-first for static assets
  e.respondWith(
    caches.match(req).then(function(r){
      return r || fetch(req).then(function(rr){
        if(rr && rr.ok){
          var cp = rr.clone();
          caches.open(CACHE).then(function(c){ c.put(req, cp); });
        }
        return rr;
      });
    })
  );
});

// ---------- تذكيرات «تمرين ساف» و«تمرين نخبة السبت» (Web Push) ----------
// لا تحذف هذا الجزء: التطبيقان يستخدمان نفس الـ Service Worker لاستقبال التذكيرات
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(x){ d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'تذكير', {
    body: d.body || '', icon: d.icon || 'icon-saff-192.png', badge: d.icon || 'icon-saff-192.png',
    tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(ws){
    var page = url.replace(/^\.\//, '');
    for (var i = 0; i < ws.length; i++) { if (page && ws[i].url.indexOf(page) >= 0 && 'focus' in ws[i]) return ws[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
