(() => {
  'use strict';

  const rand = () => Math.random();
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const KEY = 'we-genesis-v1';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}

  const state = {
    running: false,
    epoch: Number(saved?.epoch) || 0,
    births: Number(saved?.births) || 0,
    species: Number(saved?.species) || 1,
    energy: Number(saved?.energy) || 1000,
    population: Number(saved?.population) || 180,
    mutation: Number(saved?.mutation) || 0.035,
    speed: 1,
    log: Array.isArray(saved?.log) ? saved.log.slice(-40) : ['GENESIS CORE initialized.','A sterile world is waiting.']
  };

  let organisms = [];
  let raf = 0;
  let last = performance.now();
  let canvas, ctx;

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({...state, log:state.log.slice(-40)})); } catch (_) {}
  }
  function note(text) {
    const stamp = String(state.epoch).padStart(7,'0');
    state.log.push('['+stamp+'] '+text);
    state.log = state.log.slice(-40);
    const el = document.querySelector('#genesisLog'); if (el) el.textContent = state.log.join('\n');
    persist();
  }
  function seedWorld() {
    organisms = Array.from({length:state.population},(_,i)=>({
      x:rand(), y:rand(), vx:(rand()-.5)*.0018, vy:(rand()-.5)*.0018,
      energy:30+rand()*70, age:rand()*500, genome:Math.floor(rand()*state.species), size:1.5+rand()*2.5
    }));
  }
  function resize() {
    if (!canvas) return;
    const r=canvas.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(r.width*d)); canvas.height=Math.max(1,Math.floor(r.height*d));
    ctx.setTransform(d,0,0,d,0,0);
  }
  function evolve(dt) {
    const births = [];
    const next = [];
    const capacity = 700;
    for (const o of organisms) {
      o.age += dt; o.energy -= dt*(0.018 + Math.hypot(o.vx,o.vy)*7);
      o.x += o.vx*dt*state.speed; o.y += o.vy*dt*state.speed;
      if(o.x<0||o.x>1)o.vx*=-1; if(o.y<0||o.y>1)o.vy*=-1;
      o.x=clamp(o.x,0,1); o.y=clamp(o.y,0,1);
      o.vx=clamp(o.vx+(rand()-.5)*state.mutation*.0008, -.003,.003);
      o.vy=clamp(o.vy+(rand()-.5)*state.mutation*.0008, -.003,.003);
      if(o.energy>92 && rand()<.0018*state.speed && next.length+births.length<capacity){
        o.energy*=.46; const mutation=rand()<state.mutation?Math.floor(rand()*Math.max(2,state.species+1)):o.genome;
        births.push({...o,x:clamp(o.x+(rand()-.5)*.025,0,1),y:clamp(o.y+(rand()-.5)*.025,0,1),energy:o.energy,age:0,genome:mutation,size:clamp(o.size+(rand()-.5)*.6,.8,5)});
        state.births++;
      }
      if(o.energy>0 && o.age<12000) next.push(o);
    }
    organisms=next.concat(births);
    state.population=organisms.length;
    state.epoch += dt*state.speed;
    state.energy=Math.max(0,state.energy + births.length*.7 - next.length*.002*dt);
    const seen=new Set(organisms.map(o=>o.genome)); state.species=Math.max(1,seen.size);
    if(state.epoch>0 && Math.floor(state.epoch)%500===0 && Math.floor(state.epoch)!==state._lastEpoch){
      state._lastEpoch=Math.floor(state.epoch);
      note('Evolutionary checkpoint · population '+state.population+' · '+state.species+' genomes.');
    }
    if(state.population===0){state.running=false;note('EXTINCTION. Press REBIRTH to reseed the biosphere.');}
  }
  function draw() {
    if(!ctx) return;
    const w=canvas.clientWidth,h=canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='rgba(2,8,14,.96)';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(150,230,255,.06)';ctx.lineWidth=1;
    for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(const o of organisms){
      const x=o.x*w,y=o.y*h, glow=2+o.size*1.8;
      ctx.beginPath();ctx.arc(x,y,glow,0,Math.PI*2);ctx.fillStyle='rgba(90,220,255,.045)';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,o.size,0,Math.PI*2);ctx.fillStyle=o.genome%7===0?'rgba(255,230,120,.95)':'rgba(110,235,255,.78)';ctx.fill();
    }
  }
  function tick(now){
    const dt=Math.min(40,now-last);last=now;if(state.running)evolve(dt);draw();updateUI();raf=requestAnimationFrame(tick);}
  function updateUI(){
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('genEpoch',Math.floor(state.epoch).toLocaleString());set('genPop',state.population.toLocaleString());set('genSpecies',state.species.toLocaleString());set('genBirths',state.births.toLocaleString());
    const status=document.getElementById('genStatus');if(status)status.textContent=state.running?'● EVOLVING':'○ PAUSED';
    const log=document.getElementById('genesisLog');if(log)log.textContent=state.log.join('\n');
  }
  function open(){
    document.getElementById('genesisOverlay')?.classList.add('open');
    resize();updateUI();draw();
  }
  function close(){document.getElementById('genesisOverlay')?.classList.remove('open');}
  function build(){
    if(document.getElementById('genesisOverlay'))return;
    const trigger=document.createElement('button');trigger.className='tool genesis-trigger';trigger.id='genesisTrigger';trigger.type='button';trigger.title='Open Genesis Lab';trigger.textContent='🧬';document.querySelector('.side')?.appendChild(trigger);trigger.onclick=open;
    const overlay=document.createElement('div');overlay.id='genesisOverlay';overlay.className='genesis-overlay';overlay.innerHTML=`<div class="genesis-shell"><div class="genesis-head"><div><div class="genesis-kicker">WORLD EXPLORER // EXPERIMENTAL SYSTEM</div><div class="genesis-title">🧬 PROJECT GENESIS <span id="genStatus">○ PAUSED</span></div></div><button class="genesis-close" id="genClose">×</button></div><div class="genesis-grid"><div class="genesis-card genesis-canvas-wrap"><div class="genesis-overlay-label">ARTIFICIAL BIOSPHERE · LOCAL SIMULATION</div><canvas class="genesis-canvas" id="genesisCanvas"></canvas></div><div class="genesis-side"><div class="genesis-stats"><div class="genesis-stat"><small>EPOCH</small><b id="genEpoch">0</b></div><div class="genesis-stat"><small>POPULATION</small><b id="genPop">0</b></div><div class="genesis-stat"><small>GENOMES</small><b id="genSpecies">0</b></div><div class="genesis-stat"><small>BIRTHS</small><b id="genBirths">0</b></div></div><div class="genesis-controls"><button class="genesis-btn" id="genRun">▶ EVOLVE</button><button class="genesis-btn" id="genRebirth">↻ REBIRTH</button><button class="genesis-btn" id="genFast">⚡ x10</button><button class="genesis-btn genesis-danger" id="genWipe">☢ WIPE</button></div><div class="genesis-card genesis-log" id="genesisLog"></div><div class="genesis-footer">The biosphere is procedural and runs locally in this browser. State is stored only in localStorage. No autonomous access to your device, files, network, or accounts is granted by Genesis.</div></div></div></div>`;
    document.body.appendChild(overlay);
    canvas=document.getElementById('genesisCanvas');ctx=canvas.getContext('2d');
    document.getElementById('genClose').onclick=close;
    document.getElementById('genRun').onclick=()=>{state.running=!state.running;note(state.running?'Evolution resumed.':'Evolution paused.');};
    document.getElementById('genRebirth').onclick=()=>{state.epoch=0;state.population=180;state.births=0;state.species=1;state.energy=1000;state.running=true;seedWorld();note('REBIRTH · a fresh biosphere has emerged.');};
    document.getElementById('genFast').onclick=()=>{state.speed=state.speed===1?10:1;document.getElementById('genFast').textContent=state.speed===10?'⚡ x10':'⚡ x1';};
    document.getElementById('genWipe').onclick=()=>{state.running=false;state.epoch=0;state.population=0;state.births=0;state.species=0;organisms=[];state.log=[];note('Biosphere erased.');};
    window.addEventListener('resize',resize);seedWorld();requestAnimationFrame(tick);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();