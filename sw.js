const CACHE = 'world-explorer-v32';
const CORE = ['/', '/index.html', '/style.css?v=32', '/ui-overrides.css?v=32', '/weather.css?v=32', '/app.js?v=32', '/movement-engine.js?v=32', '/mobile-engine.js?v=32', '/radar-visibility.js?v=32', '/hud-toggle.js?v=32', '/signal-polish.js?v=32', '/weather-engine.js?v=32', '/world-events.js?v=32', '/expedition-engine.js?v=32', '/ride-visuals.js?v=32', '/manifest.webmanifest', '/vendor/leaflet.js', '/vendor/leaflet.css'];
const NO_CACHE = ['/app.js', '/style.css', '/ui-overrides.css', '/weather.css', '/movement-engine.js', '/mobile-engine.js', '/radar-visibility.js', '/hud-toggle.js', '/signal-polish.js', '/weather-engine.js', '/world-events.js', '/expedition-engine.js', '/ride-visuals.js', '/index.html', '/sw.js'];
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
