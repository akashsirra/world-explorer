/* World Explorer v17 — guaranteed ambient constellation */
(() => {
  'use strict';
  const boot = () => {
    const mapEl = document.getElementById('map');
    if (!mapEl || mapEl.__weRadarVisibility) return;
    mapEl.__weRadarVisibility = true;

    const layer = document.createElement('div');
    layer.className = 'radar-ambient-layer';
    layer.setAttribute('aria-hidden', 'true');
    mapEl.appendChild(layer);

    const signals = [
      {x:-128,y:-86,icon:'✦',rare:true},
      {x:-178,y:8,icon:'◇'},
      {x:-96,y:104,icon:'☕'},
      {x:34,y:-132,icon:'✧'},
      {x:74,y:58,icon:'☁'}
    ];

    signals.forEach((s,i) => {
      const el = document.createElement('button');
      el.className = 'radar-ambient-signal' + (s.rare ? ' rare' : '');
      el.style.setProperty('--delay', (i * 0.32) + 's');
      el.innerHTML = '<span></span><b>' + s.icon + '</b>';
      el.setAttribute('aria-label', 'Nearby signal');
      el.addEventListener('click', () => document.getElementById('scan')?.click());
      layer.appendChild(el);
      s.el = el;
    });

    const render = () => {
      const core = mapEl.querySelector('.core-wrap');
      const coreRect = core?.getBoundingClientRect();
      const mapRect = mapEl.getBoundingClientRect();
      const actual = mapEl.querySelectorAll('.radar-signal').length;
      layer.classList.toggle('has-real-signals', actual > 0);
      if (!coreRect || actual > 0) return;
      const cx = coreRect.left - mapRect.left + coreRect.width / 2;
      const cy = coreRect.top - mapRect.top + coreRect.height / 2;
      const w = mapRect.width, h = mapRect.height;
      signals.forEach(s => {
        const x = Math.max(28, Math.min(w - 28, cx + s.x));
        const y = Math.max(120, Math.min(h - 130, cy + s.y));
        s.el.style.transform = `translate3d(${x - 18}px,${y - 18}px,0)`;
      });
    };

    const loop = () => { render(); requestAnimationFrame(loop); };
    loop();
    window.addEventListener('resize', render, {passive:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 350));
  else setTimeout(boot, 350);
})();
