(() => {
  'use strict';
  if (!window.L) return;

  const KEY = 'we-trip-v1';
  const MAX_POINTS = 1200;
  const MIN_POINT_METERS = 3;
  const MAX_ACCURACY = 65;
  const MAX_JUMP_METERS = 250;
  const NEW_TRIP_METERS = 1000;
  const FOLLOW_AFTER_METERS = 18;

  let map = null, core = null, watchId = null, tracking = false, follow = true;
  let route = null, routeInner = null, last = null, points = [], totalMeters = 0;
  let statusEl = null, animationFrame = 0;

  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const haversine = (a,b) => {
    const R=6371000,p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLng=(b.lng-a.lng)*p;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(clamp(x,0,1)));
  };
  const bearing = (a,b) => {
    const p=Math.PI/180,y=Math.sin((b.lng-a.lng)*p)*Math.cos(b.lat*p);
    const x=Math.cos(a.lat*p)*Math.sin(b.lat*p)-Math.sin(a.lat*p)*Math.cos(b.lat*p)*Math.cos((b.lng-a.lng)*p);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  };

  function loadTrip(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!saved||!Array.isArray(saved.points))return;
      points=saved.points.slice(-MAX_POINTS); totalMeters=Number(saved.totalMeters)||0;
      last=points.length?points[points.length-1]:null;
    }catch(_){ }
  }
  function saveTrip(){try{localStorage.setItem(KEY,JSON.stringify({points:points.slice(-MAX_POINTS),totalMeters}));}catch(_){}}

  function injectStyle(){
    if(document.getElementById('movement-engine-style'))return;
    const style=document.createElement('style'); style.id='movement-engine-style';
    style.textContent=`
      .we-route-glow{filter:drop-shadow(0 0 5px rgba(74,213,255,.65))}
      .we-track-status{position:fixed;z-index:6000;left:18px;top:92px;display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid rgba(110,225,255,.28);border-radius:999px;background:rgba(6,16,24,.78);backdrop-filter:blur(12px);color:rgba(232,248,255,.92);font:700 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;pointer-events:none;opacity:0;transform:translateY(-5px);transition:opacity .25s,transform .25s}
      .we-track-status.on{opacity:1;transform:translateY(0)}
      .we-track-dot{width:7px;height:7px;border-radius:50%;background:#58dcff;box-shadow:0 0 12px #58dcff;animation:weTrackPulse 1.25s ease-in-out infinite}
      .we-track-status .meters{opacity:.72;letter-spacing:.05em;text-transform:none;font-weight:600}
      @keyframes weTrackPulse{50%{transform:scale(.65);opacity:.45}}
      @media(max-width:520px){.we-track-status{left:18px;top:82px}}
      @media(prefers-reduced-motion:reduce){.we-track-dot{animation:none}}
    `;
    document.head.appendChild(style);
  }
  function createStatus(){
    if(statusEl||!document.body)return;
    statusEl=document.createElement('div'); statusEl.className='we-track-status';
    statusEl.innerHTML='<span class="we-track-dot"></span><span>TRAVEL</span><span class="meters">0 m</span>';
    document.body.appendChild(statusEl);
  }
  function status(on=tracking){
    if(!statusEl)return; statusEl.classList.toggle('on',on);
    const m=statusEl.querySelector('.meters');
    if(m)m.textContent=totalMeters>=1000?(totalMeters/1000).toFixed(2)+' km':Math.round(totalMeters)+' m';
  }

  function captureMap(){
    const original=L.map;
    L.map=function(...args){const instance=original.apply(this,args);map=instance;window.__WORLD_EXPLORER_MAP__=instance;setTimeout(init,0);return instance;};
  }
  function captureCore(){
    const original=L.marker;
    L.marker=function(...args){
      const marker=original.apply(this,args),opts=args[1]||{};
      if(Number(opts.zIndexOffset)===3000&&!core){core=marker;window.__WORLD_EXPLORER_CORE__=marker;setTimeout(init,0);}
      return marker;
    };
  }
  function routeCoords(){return points.map(p=>[p.lat,p.lng]);}
  function init(){
    if(!map||!document.body)return;
    injectStyle();createStatus();
    if(!route){
      route=L.polyline(routeCoords(),{className:'we-route-glow',color:'#55dfff',weight:7,opacity:.9,lineCap:'round',lineJoin:'round',interactive:false,pane:'overlayPane'}).addTo(map);
      routeInner=L.polyline(routeCoords(),{color:'#9df1ff',weight:2.5,opacity:.95,lineCap:'round',lineJoin:'round',interactive:false,pane:'overlayPane'}).addTo(map);
    }
    if(!map.__weMovementEvents){
      map.__weMovementEvents=true;
      map.on('dragstart',()=>{follow=false;});
      map.on('zoomstart',()=>{if(tracking)follow=false;});
    }
    route.setLatLngs(routeCoords());routeInner?.setLatLngs(routeCoords());
  }

  function resetTrip(){
    points=[];totalMeters=0;last=null;
    route?.setLatLngs([]);routeInner?.setLatLngs([]);saveTrip();status();
  }
  function setCore(lat,lng,animate=true){
    if(!core)return;
    if(!animate){core.setLatLng([lat,lng]);return;}
    const from=core.getLatLng(),to=L.latLng(lat,lng),d=haversine({lat:from.lat,lng:from.lng},{lat,lng});
    if(d<.5)return;
    const duration=clamp(d*20,280,1100),start=performance.now();cancelAnimationFrame(animationFrame);
    const tick=now=>{const t=clamp((now-start)/duration,0,1),e=t*(2-t);core.setLatLng([from.lat+(to.lat-from.lat)*e,from.lng+(to.lng-from.lng)*e]);if(t<1)animationFrame=requestAnimationFrame(tick);};
    animationFrame=requestAnimationFrame(tick);
  }
  function orient(next){
    if(!core||!last)return;
    const root=core.getElement()?.querySelector('.core-wrap');
    if(root)root.style.setProperty('--heading',bearing(last,next)+'deg');
  }

  function acceptPosition(pos){
    const c=pos.coords,lat=Number(c.latitude),lng=Number(c.longitude),accuracy=Number(c.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    if(Number.isFinite(accuracy)&&accuracy>MAX_ACCURACY)return;
    const next={lat,lng,t:Number(pos.timestamp)||Date.now(),accuracy:accuracy||0};
    if(!last){last=next;points.push(next);route?.setLatLngs(routeCoords());routeInner?.setLatLngs(routeCoords());setCore(lat,lng,false);status();saveTrip();return;}
    const d=haversine(last,next);
    if(d<MIN_POINT_METERS)return;
    if(d>NEW_TRIP_METERS){resetTrip();return acceptPosition(pos);}
    if(d>MAX_JUMP_METERS&&(!Number.isFinite(c.speed)||c.speed<0||c.speed>25))return;
    totalMeters+=d;orient(next);setCore(lat,lng,true);
    points.push(next);if(points.length>MAX_POINTS)points=points.slice(-MAX_POINTS);
    route?.setLatLngs(routeCoords());routeInner?.setLatLngs(routeCoords());
    if(follow&&map){const center=map.getCenter();if(haversine({lat:center.lat,lng:center.lng},next)>FOLLOW_AFTER_METERS)map.panTo([lat,lng],{animate:true,duration:.45,noMoveStart:true});}
    last=next;status();saveTrip();
  }

  function startTracking(){
    if(tracking||!navigator.geolocation)return;
    tracking=true;follow=true;status(true);
    watchId=navigator.geolocation.watchPosition(acceptPosition,err=>{if(err?.code===1){tracking=false;status(false);}}, {enableHighAccuracy:true,maximumAge:2000,timeout:15000});
    toastSafe('Live travel tracking on · route will follow you');
  }
  function toastSafe(message){
    const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toastSafe.t);toastSafe.t=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function hookLocation(){
    if(!navigator.geolocation||navigator.geolocation.__weWrapped)return;
    const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    const wrapped=function(success,error,options){const ok=typeof success==='function'?success:()=>{};return original(pos=>{ok(pos);setTimeout(startTracking,0);},error,options);};
    try{wrapped.__weWrapped=true;navigator.geolocation.getCurrentPosition=wrapped;}catch(_){ }
  }
  function hookCenterButton(){
    const center=document.getElementById('center');if(!center||center.__weBound)return;
    center.__weBound=true;center.addEventListener('click',()=>{follow=true;if(last&&map)map.panTo([last.lat,last.lng],{animate:true,duration:.35});});
  }

  captureMap();captureCore();loadTrip();
  const boot=()=>{init();hookLocation();hookCenterButton();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  setTimeout(boot,700);setTimeout(boot,1800);
})();
