/* LAZLOG service worker. Keep VERSION in sync with APP_VERSION in index.html. */
const VERSION = '1.0.0';
const CACHE = 'lazlog-v' + VERSION;
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(PRECACHE); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf('lazlog-v') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // never touch Groq or other cross-origin calls

  // HTML: network first, fall back to cache (offline)
  if(req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1){
    e.respondWith(
      fetch(req).then(function(res){
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Assets: cache first, then network
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return res;
      });
    })
  );
});
