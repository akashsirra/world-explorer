(() => {
  'use strict';
  if (!window.L) return;
  const KEY='we-trip-v2',MAX_POINTS=1800,MIN_POINT_METERS=7,MAX_ACCURACY=60,MAX_JUMP_METERS=250,NEW_TRIP_METERS=1000,FOLLOW_AFTER_METERS=12,STATIONARY_SPEED=1.8;
  let map=null,core=null,watchId=null,tracking=false,follow=true,route=null,routeGlow=null,last=null,points=[],totalMeters=0,currentSpeed=0,statusEl=null,raf=0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const dist=(a,b)=>{const R=6371000,p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLng=(b.lng-a.lng)*p,x=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(clamp(x,0,1)));};
  const bear=(a,b)=>{const p=Math.PI/180,y=Math.sin((b.lng-a.lng)*p)*Math.cos(b.lat*p),x=Math.cos(a.lat*p)*Math.sin(b.lat*p)-Math.sin(a.lat*p)*Math.cos(b.lat*p)*Math.cos((b.lng-a.lng)*p);return (Math.atan2(y,x)*180/Math.PI+360)%360;};
  const coords=()=>points.map(p=>[p.lat,p.lng]);
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('we-trip-v1')||'null');if(!s)return;points=Array.isArray(s.points)?s.points.slice(-MAX_POINTS):[];totalMeters=Number(s.totalMeters)||0;last=points.at(-1)||null;}catch(_){}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({points:points.slice(-MAX_POINTS),totalMeters}));}catch(_){}}
  function styles(){if(document.getElementById('we-travel-style'))return;const s=document.createElement('style');s.id='we-travel-style';s.textContent=`
    .we-travel-glow{filter:drop-shadow(0 0 7px rgba(56,220,255,.85))}
    .we-travel-status{position:fixed;z-index:6500;left:18px;top:92px;display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid rgba(91,225,255,.34);border-radius:999px;background:rgba(4,15,23,.84);backdrop-filter:blur(14px);color:#e9fbff;font:800 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:0;transform:translateY(-5px);transition:.25s;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.22)}
    .we-travel-status.on{opacity:1;transform:none}.we-travel-dot{width:8px;height:8px;border-radius:50%;background:#58e1ff;box-shadow:0 0 14px #58e1ff;animation:weTravelPulse 1.2s infinite}.we-travel-status .meters{opacity:.78;text-transform:none;letter-spacing:.02em;font-weight:700}.we-travel-status .speed{opacity:.62;text-transform:none;letter-spacing:.02em;font-weight:700}
    .travel-tool{position:relative;overflow:visible!important;border-color:rgba(91,225,255,.35)!important;box-shadow:0 0 0 1px rgba(91,225,255,.06),0 0 22px rgba(50,210,255,.12)}.travel-tool span{display:block;font-size:23px;line-height:1}.travel-tool em{display:block;margin-top:3px;font:900 7px/1 system-ui,sans-serif;letter-spacing:.16em;font-style:normal;opacity:.72}.travel-tool.active{border-color:rgba(92,231,255,.9)!important;box-shadow:0 0 0 2px rgba(92,231,255,.12),0 0 28px rgba(50,220,255,.34);animation:weRideGlow 1.8s ease-in-out infinite}.travel-tool.active em{color:#76edff;opacity:1}.travel-tool.active:after{content:'';position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:#63e7ff;box-shadow:0 0 12px #63e7ff}
    @keyframes weRideGlow{50%{transform:translateY(-1px);box-shadow:0 0 0 2px rgba(92,231,255,.16),0 0 34px rgba(50,220,255,.46)}}
    @keyframes weTravelPulse{50%{transform:scale(.55);opacity:.5}}@media(max-width:520px){.we-travel-status{top:82px;left:18px}}@media(prefers-reduced-motion:reduce){.we-travel-dot,.travel-tool.active{animation:none}}
  `;document.head.appendChild(s);}
  function status(on=tracking){if(!statusEl)return;statusEl.classList.toggle('on',on);const m=statusEl.querySelector('.meters');if(m)m.textContent=totalMeters>=1000?(totalMeters/1000).toFixed(2)+' km':Math.round(totalMeters)+' m';const sp=statusEl.querySelector('.speed');if(sp)sp.textContent=currentSpeed>=1?Math.round(currentSpeed*3.6)+' km/h':'';}
  function ui(){if(statusEl||!document.body)return;statusEl=document.createElement('div');statusEl.className='we-travel-status';statusEl.innerHTML='<span class="we-travel-dot"></span><span>LIVE TRAVEL</span><span class="meters">0 m</span><span class="speed"></span>';document.body.appendChild(statusEl);}
  function setTravelUi(){const b=document.getElementById('travel'),side=document.getElementById('travelSide'),loc=document.getElementById('loc');[b,side].forEach(x=>{if(!x)return;x.classList.toggle('active',tracking);x.setAttribute('aria-pressed',String(tracking));});if(b)b.textContent=tracking?'🚴 Ride live':'🚴 Start ride';if(side){side.innerHTML='<span>🚴</span><em>'+(tracking?'LIVE':'RIDE')+'</em>';side.setAttribute('aria-label',tracking?'Pause live bike ride':'Start live bike ride');side.title=tracking?'Pause live bike ride':'Start live bike ride';}if(loc){loc.classList.toggle('tracking',tracking);loc.title=tracking?'Live travel tracking is on':'Locate me';}}
  function capture(){const oldMap=L.map;L.map=function(...args){const m=oldMap.apply(this,args);map=m;window.__WORLD_EXPLORER_MAP__=m;setTimeout(init,0);return m;};const oldMarker=L.marker;L.marker=function(...args){const m=oldMarker.apply(this,args),o=args[1]||{};if(Number(o.zIndexOffset)===3000&&!core){core=m;window.__WORLD_EXPLORER_CORE__=m;setTimeout(init,0);}return m;};}
  function init(){if(!map||!document.body)return;styles();ui();if(!route){routeGlow=L.polyline(coords(),{className:'we-travel-glow',color:'#24cfff',weight:11,opacity:.28,lineCap:'round',lineJoin:'round',interactive:false,pane:'overlayPane'}).addTo(map);route=L.polyline(coords(),{color:'#72eaff',weight:5,opacity:.98,lineCap:'round',lineJoin:'round',interactive:false,pane:'overlayPane'}).addTo(map);}route.setLatLngs(coords());routeGlow.setLatLngs(coords());if(!map.__weTravelEvents){map.__weTravelEvents=true;map.on('dragstart',()=>{follow=false;});map.on('zoomstart',()=>{if(tracking)follow=false;});}hookButtons();}
  function moveCore(lat,lng,animate=true){if(!core)return;if(!animate){core.setLatLng([lat,lng]);return;}const from=core.getLatLng(),to=L.latLng(lat,lng),d=dist({lat:from.lat,lng:from.lng},{lat,lng});if(d<.5)return;const start=performance.now(),duration=clamp(d*18,220,900);cancelAnimationFrame(raf);const tick=now=>{const t=clamp((now-start)/duration,0,1),e=t*(2-t);core.setLatLng([from.lat+(to.lat-from.lat)*e,from.lng+(to.lng-from.lng)*e]);if(t<1)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}
  function heading(next){if(!core||!last)return;const el=core.getElement()?.querySelector('.core-wrap');if(el)el.style.setProperty('--heading',bear(last,next)+'deg');}
  function position(pos){
    if(!tracking)return;
    const c=pos.coords,lat=Number(c.latitude),lng=Number(c.longitude),accuracy=Number(c.accuracy);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    if(Number.isFinite(accuracy)&&accuracy>MAX_ACCURACY)return;
    const next={lat,lng,t:Number(pos.timestamp)||Date.now(),accuracy:accuracy||0};
    if(!last){last=next;points.push(next);moveCore(lat,lng,false);route?.setLatLngs(coords());routeGlow?.setLatLngs(coords());save();status();return;}
    const d=dist(last,next);
    const gpsSpeed=Number(c.speed);
    const reportedSpeed=Number.isFinite(gpsSpeed)&&gpsSpeed>=0?gpsSpeed:null;
    const accuracyFloor=Math.max(MIN_POINT_METERS,Math.min(12,accuracy*0.75));
    // Phone GPS can wander several metres while completely stationary. Ignore those fixes.
    // When the OS reports a real walking/riding speed, allow a smaller step.
    const movingBySpeed=reportedSpeed!==null&&reportedSpeed>=STATIONARY_SPEED;
    if(d<accuracyFloor&&!movingBySpeed)return;
    if(d<MIN_POINT_METERS&&!movingBySpeed)return;
    if(d>NEW_TRIP_METERS){points=[];totalMeters=0;currentSpeed=0;last=null;route?.setLatLngs([]);routeGlow?.setLatLngs([]);save();return position(pos);}
    if(d>MAX_JUMP_METERS&&(!Number.isFinite(c.speed)||c.speed<0||c.speed>25))return;
    const dt=Math.max(0.25,(next.t-last.t)/1000);
    const inferredSpeed=d/dt;
    // A large apparent speed from one GPS jump is almost always location noise.
    if(reportedSpeed===null&&inferredSpeed>18)return;
    if(reportedSpeed!==null&&reportedSpeed<STATIONARY_SPEED&&d<12)return;
    heading(next);
    currentSpeed=reportedSpeed!==null?reportedSpeed:inferredSpeed;
    if(currentSpeed>40)currentSpeed=40;
    moveCore(lat,lng,true);
    points.push(next);if(points.length>MAX_POINTS)points=points.slice(-MAX_POINTS);
    totalMeters+=d;last=next;
    route?.setLatLngs(coords());routeGlow?.setLatLngs(coords());
    if(follow&&map){const center=map.getCenter();if(dist({lat:center.lat,lng:center.lng},next)>FOLLOW_AFTER_METERS)map.panTo([lat,lng],{animate:true,duration:.45,noMoveStart:true});}
    status();save();
  }
  function beginWatch(){if(watchId!==null||!tracking||!navigator.geolocation)return;watchId=navigator.geolocation.watchPosition(position,error=>{if(error?.code===1){tracking=false;watchId=null;status(false);setTravelUi();toast('Location permission is needed for Live Travel');}},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});}
  function startTracking(){if(tracking||!navigator.geolocation)return;tracking=true;follow=true;status(true);setTravelUi();toast('LIVE RIDE on · GPS stabilizing');beginWatch();}
  function stopTracking(){if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;tracking=false;currentSpeed=0;status(false);setTravelUi();toast('Ride tracking paused · trail saved');}
  function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600);}
  function hookButtons(){setTravelUi();const loc=document.getElementById('loc');if(loc&&!loc.__weTravelBound){loc.__weTravelBound=true;loc.addEventListener('click',()=>setTimeout(()=>{if(tracking)beginWatch();},0));}const center=document.getElementById('center');if(center&&!center.__weTravelBound){center.__weTravelBound=true;center.addEventListener('click',()=>{follow=true;if(last&&map)map.panTo([last.lat,last.lng],{animate:true,duration:.35});});}const travel=document.getElementById('travel');if(travel&&!travel.__weTravelBound){travel.__weTravelBound=true;travel.addEventListener('click',()=>tracking?stopTracking():startTracking());}const side=document.getElementById('travelSide');if(side&&!side.__weTravelBound){side.__weTravelBound=true;side.addEventListener('click',()=>tracking?stopTracking():startTracking());}}
  capture();load();const boot=()=>{init();hookButtons();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();setTimeout(boot,500);setTimeout(boot,1500);setTimeout(boot,3000);
})();