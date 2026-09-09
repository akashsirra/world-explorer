const CACHE='world-explorer-v9';
const CORE=['/','/index.html','/style.css?v=9','/app.js?v=9','/vendor/leaflet.js?v=9','/vendor/leaflet.css?v=9','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async c=>{for(const url of CORE){try{await c.add(url)}catch{}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy)).catch(()=>{});return response}).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match('/index.html'))));
});
