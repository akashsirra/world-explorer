(() => {
  'use strict';
  const KEY = 'we-expedition-v1';
  const MILESTONE = 250;
  let map = null, last = null, distance = 0, next = MILESTONE, timer = null;
  let milestones = [];

  const $ = s => document.querySelector(s);
  const hav = (a,b) => {
    const R=6371000, p=Math.PI/180, d1=(b.lat-a.lat)*p, d2=(b.lng-a.lng)*p;
    const x=Math.sin(d1/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(d2/2)**2;
    return 2*R*Math.asin(Math.sqrt(Math.min(1,x)));
  };

  function load(){
    try{
      const s=JSON.parse(localStorage.getItem(KEY)||'null');
      distance=Number(s?.distance)||0;
      next=Math.max(MILESTONE,Number(s?.next)||MILESTONE);
      milestones=Array.isArray(s?.milestones)?s.milestones:[];
    }catch(_){}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({distance,next,milestones:milestones.slice(-100)}));}catch(_) {}}

  function styles(){
    if($('#we-expedition-style'))return;
    const s=document.createElement('style'); s.id='we-expedition-style';
    s.textContent=`
      .we-expedition{position:fixed;z-index:6450;left:50%;bottom:92px;transform:translateX(-50%) translateY(10px);display:flex;align-items:center;gap:9px;padding:8px 12px;border:1px solid rgba(255,213,92,.28);border-radius:999px;background:rgba(5,16,24,.88);backdrop-filter:blur(16px);box-shadow:0 8px 30px rgba(0,0,0,.25),0 0 22px rgba(255,205,70,.08);color:#f8fbff;font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;opacity:0;pointer-events:none;transition:.3s}.we-expedition.on{opacity:1;transform:translateX(-50%) translateY(0)}.we-expedition .xp{color:#ffd85b}.we-expedition .dist{opacity:.68;letter-spacing:.03em}.we-expedition .dot{width:7px;height:7px;border-radius:50%;background:#ffd85b;box-shadow:0 0 12px #ffd85b;animation:weXp 1.2s ease-in-out infinite}@keyframes weXp{50%{transform:scale(.55);opacity:.55}}
      .we-milestone{animation:weMilestone 2.4s ease-out infinite}.we-milestone-core{filter:drop-shadow(0 0 8px rgba(255,216,91,.9))}@keyframes weMilestone{0%{opacity:.75;transform:scale(.7)}70%{opacity:.08;transform:scale(1.5)}100%{opacity:0;transform:scale(1.7)}}
      .we-xp-toast{position:fixed;z-index:7000;left:50%;top:50%;transform:translate(-50%,-40%) scale(.9);padding:15px 20px;border:1px solid rgba(255,216,91,.4);border-radius:22px;background:rgba(5,15,22,.94);box-shadow:0 14px 50px rgba(0,0,0,.4),0 0 35px rgba(255,210,70,.12);text-align:center;color:#fff;opacity:0;pointer-events:none;transition:.45s cubic-bezier(.2,.8,.2,1);font-family:system-ui,sans-serif}.we-xp-toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.we-xp-toast b{display:block;color:#ffd85b;letter-spacing:.14em;font-size:11px}.we-xp-toast strong{display:block;margin-top:4px;font-size:24px}.we-xp-toast small{display:block;margin-top:3px;color:#aebfc7}
      @media(max-width:520px){.we-expedition{bottom:78px}}
    `; document.head.appendChild(s);
  }

  function ui(){
    if($('#weExpedition'))return;
    const el=document.createElement('div'); el.id='weExpedition'; el.className='we-expedition';
    el.innerHTML='<span class="dot"></span><span>EXPEDITION</span><span class="dist">0 m</span><span class="xp">+0 XP</span>';
    document.body.appendChild(el);
  }
  function toast(){
    let el=$('#weXpToast');
    if(!el){el=document.createElement('div');el.id='weXpToast';el.className='we-xp-toast';document.body.appendChild(el);}
    el.innerHTML='<b>EXPEDITION MILESTONE</b><strong>+100 XP ✦</strong><small>'+Math.round(distance/100)*100+' m explored on this ride</small>';
    el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function marker(){
    if(!map)return;
    const core=window.__WORLD_EXPLORER_CORE__;
    if(!core)return;
    const p=core.getLatLng();
    const ring=L.circleMarker(p,{radius:13,color:'#ffd85b',weight:2,opacity:.32,fillOpacity:0,interactive:false,className:'we-milestone'}).addTo(map);
    const dot=L.circleMarker(p,{radius:4,color:'#fff8c7',weight:2,fillColor:'#ffd85b',fillOpacity:1,interactive:false,className:'we-milestone-core'}).addTo(map);
    milestones.push({lat:p.lat,lng:p.lng,at:Date.now()});
    if(milestones.length>100)milestones.shift();
    setTimeout(()=>{map?.removeLayer(ring);map?.removeLayer(dot);},12000);
    toast(); save();
  }
  function tick(){
    map=window.__WORLD_EXPLORER_MAP__||map;
    const core=window.__WORLD_EXPLORER_CORE__;
    const active=$('#travel')?.classList.contains('active') || $('#travelSide')?.classList.contains('active');
    const el=$('#weExpedition');
    if(!core||!el)return;
    const p=core.getLatLng();
    if(last && active){
      const d=hav(last,p);
      if(d>=1 && d<120){distance+=d;}
    }
    last={lat:p.lat,lng:p.lng};
    el.querySelector('.dist').textContent=distance>=1000?(distance/1000).toFixed(2)+' km':Math.round(distance)+' m';
    el.querySelector('.xp').textContent='+'+Math.floor(distance/10)+' XP';
    el.classList.toggle('on',!!active);
    if(active && distance>=next){next+=MILESTONE;marker();}
    if(active)save();
  }
  function boot(){styles();ui();load();if(!timer)timer=setInterval(tick,1000);tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000),{once:true});else setTimeout(boot,1000);
})();
