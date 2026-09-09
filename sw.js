const CACHE='world-explorer-v11';
const CORE=['/','/index.html','/style.css?v=11','/app.js?v=11','/vendor/leaflet.js?v=11','/vendor/leaflet.css?v=11','/manifest.webmanifest'];
const NO_CACHE=['/app.js','/style.css','/vendor/leaflet.js','/vendor/leaflet.css','/index.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async c=>{for(const url of CORE){try{const r=await fetch(url,{cache:'no-store'});if(r.ok)await c.put(url,r)}catch{}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;
  const path=u.pathname;
  const critical=event.request.mode==='navigate'||NO_CACHE.includes(path);
  if(critical){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok&&event.request.mode==='navigate'){const copy=response.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy)).catch(()=>{})}return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{})}return response}).catch(()=>caches.match('/index.html'))));
});
