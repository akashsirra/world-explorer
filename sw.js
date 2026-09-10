const CACHE = 'world-explorer-v17';
const CORE = ['/', '/index.html', '/style.css?v=17', '/ui-overrides.css?v=17', '/app.js?v=17', '/mobile-engine.js?v=17', '/radar-visibility.js?v=17', '/manifest.webmanifest', '/vendor/leaflet.js', '/vendor/leaflet.css'];
const NO_CACHE = ['/app.js', '/style.css', '/ui-overrides.css', '/mobile-engine.js', '/radar-visibility.js', '/index.html', '/sw.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    for (const url of CORE) { try { const r=await fetch(url,{cache:'no-store'}); if(r.ok) await cache.put(url,r); } catch(_){} }
  }).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const critical=event.request.mode==='navigate'||NO_CACHE.includes(url.pathname);
  if(critical){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response.ok&&event.request.mode==='navigate'){const copy=response.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy)).catch(()=>{});} return response;
    }).catch(()=>caches.match(event.request).then(c=>c||caches.match('/index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});} return response;
  }).catch(()=>caches.match('/index.html'))));
});
