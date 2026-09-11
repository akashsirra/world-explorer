(() => {
  'use strict';
  if (!window.L) return;

  const KEY = 'we-anomalies-v1';
  const $ = s => document.querySelector(s);
  let map = null;
  let rift = null;
  let ring = null;
  let button = null;
  let card = null;
  let autoTimer = null;
  let expiresTimer = null;
  let count = 0;

  const clamp = (v,a,b) => Math.min(b, Math.max(a,v));
  const hash = v => { const x = Math.sin(v * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const distPoint = (lat,lng,meters,bearing) => {
    const p = Math.PI / 180;
    const d = meters / 6371000;
    const br = bearing * p;
    const la = Math.asin(Math.sin(lat*p)*Math.cos(d) + Math.cos(lat*p)*Math.sin(d)*Math.cos(br));
    const lo = lng*p + Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(lat*p), Math.cos(d)-Math.sin(lat*p)*Math.sin(la));
    return [la/p, ((lo/p + 540) % 360) - 180];
  };

  function load(){
    try { count = Number(JSON.parse(localStorage.getItem(KEY)||'{}').count) || 0; } catch(_) {}
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify({count})); } catch(_) {} }

  function styles(){
    if($('#we-anomaly-style')) return;
    const s=document.createElement('style'); s.id='we-anomaly-style';
    s.textContent=`
      .rift-tool{position:relative;overflow:visible!important;border-color:rgba(193,120,255,.5)!important;box-shadow:0 0 0 1px rgba(193,120,255,.08),0 0 24px rgba(161,77,255,.16)}
      .rift-tool span{display:block;font-size:23px;line-height:1}.rift-tool em{display:block;margin-top:3px;font:900 7px/1 system-ui,sans-serif;letter-spacing:.16em;font-style:normal;opacity:.72}.rift-tool.active{border-color:rgba(224,170,255,.95)!important;box-shadow:0 0 0 2px rgba(214,131,255,.15),0 0 34px rgba(173,75,255,.4)}.rift-tool.active:after{content:'';position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:#d79cff;box-shadow:0 0 14px #d79cff}
      .we-rift{position:relative;width:54px;height:54px}.we-rift .r{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(214,145,255,.72);box-shadow:0 0 16px rgba(176,72,255,.55),inset 0 0 15px rgba(130,40,255,.28);animation:weRift 1.8s ease-out infinite}.we-rift .r2{inset:8px;border-color:rgba(109,226,255,.7);animation-delay:.35s}.we-rift b{position:absolute;inset:14px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(232,194,255,.95),rgba(116,55,198,.85) 48%,rgba(13,22,35,.96));color:white;font-size:16px;box-shadow:0 0 20px rgba(192,96,255,.9);animation:weRiftSpin 2.6s linear infinite}@keyframes weRift{0%{transform:scale(.65);opacity:.9}80%{transform:scale(1.35);opacity:.05}100%{opacity:0}}@keyframes weRiftSpin{to{transform:rotate(360deg)}}
      .we-rift-card{position:fixed;z-index:6900;left:50%;top:50%;transform:translate(-50%,-45%) scale(.92);width:min(360px,calc(100vw - 42px));padding:20px;border:1px solid rgba(207,139,255,.48);border-radius:26px;background:rgba(5,12,22,.95);backdrop-filter:blur(22px);box-shadow:0 20px 80px rgba(0,0,0,.55),0 0 55px rgba(158,68,255,.2);color:#f7fbff;text-align:center;opacity:0;pointer-events:none;transition:.35s cubic-bezier(.2,.8,.2,1);font-family:system-ui,sans-serif}.we-rift-card.show{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}.we-rift-card .orb{font-size:42px;filter:drop-shadow(0 0 18px rgba(211,142,255,.9))}.we-rift-card b{display:block;margin-top:8px;color:#dca8ff;letter-spacing:.16em;font-size:11px}.we-rift-card p{margin:8px 0 15px;color:#b7c5d0;font-size:12px;line-height:1.45}.we-rift-card button{border:0;border-radius:14px;padding:11px 16px;background:linear-gradient(135deg,#a950ff,#43dfff);color:#071018;font-weight:900;letter-spacing:.08em}.we-rift-card .close-rift{margin-left:7px;background:rgba(255,255,255,.08);color:#eaf4f8}.we-rift-toast{position:fixed;z-index:7000;left:50%;top:42%;transform:translate(-50%,-50%) scale(.8);padding:16px 20px;border:1px solid rgba(219,155,255,.5);border-radius:20px;background:rgba(4,11,19,.95);box-shadow:0 18px 65px rgba(0,0,0,.45),0 0 45px rgba(171,73,255,.2);text-align:center;color:#fff;opacity:0;pointer-events:none;transition:.45s cubic-bezier(.2,.8,.2,1);font-family:system-ui,sans-serif}.we-rift-toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.we-rift-toast b{display:block;color:#dca8ff;letter-spacing:.15em;font-size:10px}.we-rift-toast strong{display:block;margin-top:4px;font-size:23px}.we-rift-toast small{display:block;margin-top:3px;color:#9fb1bc}
      @media(max-width:520px){.we-rift-card{width:calc(100vw - 42px)}}
    `;
    document.head.appendChild(s);
  }

  function ui(){
    const side=$('.side');
    if(side && !$('#riftSide')){
      button=document.createElement('button'); button.id='riftSide'; button.className='tool rift-tool'; button.type='button'; button.setAttribute('aria-label','Open a reality rift'); button.innerHTML='<span>🌀</span><em>RIFT</em>'; side.insertBefore(button, $('#travelSide') || null);
      button.onclick=()=>spawn(true);
    }
    if(!card){
      card=document.createElement('div'); card.className='we-rift-card'; card.innerHTML='<div class="orb">🌀</div><b>REALITY RIFT DETECTED</b><p>A temporary fracture has appeared nearby. Entering it does not change your real GPS position — it only bends the Explorer world.</p><button id="enterRift">ENTER RIFT</button><button class="close-rift" id="closeRift">CLOSE</button>'; document.body.appendChild(card);
      $('#closeRift').onclick=()=>card.classList.remove('show');
      $('#enterRift').onclick=enter;
    }
  }

  function attach(){ map=window.__WORLD_EXPLORER_MAP__ || map; return !!map; }

  function spawn(manual=false){
    if(!attach()) return;
    if(rift){ clear(); }
    const c=map.getCenter();
    const now=Math.floor(Date.now()/1000);
    const q=now*0.73 + c.lat*31 + c.lng*17;
    const meters=manual ? 220+hash(q)*300 : 300+hash(q)*550;
    const bearing=hash(q+9)*360;
    const [lat,lng]=distPoint(c.lat,c.lng,meters,bearing);
    const ll=[clamp(lat,-89.8,89.8),lng];
    rift=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="we-rift"><span class="r"></span><span class="r r2"></span><b>✦</b></div>',iconSize:[54,54],iconAnchor:[27,27]}),zIndexOffset:2600,interactive:true}).addTo(map);
    ring=L.circle(ll,{radius:55,color:'#c878ff',weight:2,opacity:.38,fillColor:'#8d43ff',fillOpacity:.025,interactive:false}).addTo(map);
    rift.on('click',()=>{card.classList.add('show');});
    button?.classList.add('active');
    clearTimeout(expiresTimer); expiresTimer=setTimeout(clear,90000);
    if(manual){map.flyTo(ll,Math.max(map.getZoom(),16),{duration:1.15});toast('Reality rift located · '+Math.round(meters)+' m away');}
  }

  function enter(){
    if(!rift || !map) return;
    const p=rift.getLatLng();
    card.classList.remove('show');
    map.flyTo([p.lat,p.lng],Math.min(18,Math.max(map.getZoom(),16)+1),{duration:1.1});
    count++; save();
    clear();
    setTimeout(()=>toast('RIFT ENTERED · reality shifted ✦'),850);
    try{window.dispatchEvent(new CustomEvent('we:rift-entered',{detail:{lat:p.lat,lng:p.lng,at:Date.now(),count}}));}catch(_){}
  }

  function clear(){
    if(map && rift) map.removeLayer(rift);
    if(map && ring) map.removeLayer(ring);
    rift=null; ring=null; button?.classList.remove('active'); clearTimeout(expiresTimer);
  }

  function toast(msg){
    let el=$('#weRiftToast'); if(!el){el=document.createElement('div');el.id='weRiftToast';el.className='we-rift-toast';document.body.appendChild(el);}
    el.innerHTML='<b>WORLD ANOMALY</b><strong>'+msg+'</strong><small>'+count+' rifts entered</small>';
    el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function boot(){
    styles(); load(); ui();
    attach();
    if(!autoTimer) autoTimer=setInterval(()=>{ if(!rift && Math.random()>.68) spawn(false); },180000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200),{once:true}); else setTimeout(boot,1200);
})();