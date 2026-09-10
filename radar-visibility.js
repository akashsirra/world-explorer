/* World Explorer v20 — reliable ambient constellation */
(() => {
  'use strict';
  const boot = () => {
    const mapEl = document.getElementById('map');
    if (!mapEl || mapEl.__weRadarVisibility) return;
    mapEl.__weRadarVisibility = true;

    const layer = document.createElement('div');
    layer.className = 'radar-ambient-layer';
    layer.setAttribute('aria-label', 'Nearby exploration signals');
    mapEl.appendChild(layer);

    const signals = [
      {x:-112,y:-92,icon:'✦',rare:true},
      {x:-162,y:0,icon:'◇'},
      {x:-86,y:96,icon:'☕'},
      {x:42,y:-112,icon:'✧'},
      {x:88,y:62,icon:'☁'}
    ];

    signals.forEach((s,i) => {
      const el = document.createElement('button');
      el.className = 'radar-ambient-signal' + (s.rare ? ' rare' : '');
      el.style.setProperty('--delay', (i * 0.32) + 's');
      el.innerHTML = '<span></span><b>' + s.icon + '</b>';
      el.setAttribute('aria-label', 'Nearby exploration signal');
      el.addEventListener('click', () => document.getElementById('scan')?.click());
      layer.appendChild(el);
      s.el = el;
    });

    const isRealSignalVisible = () => [...mapEl.querySelectorAll('.radar-signal')].some(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    });

    const render = () => {
      const core = mapEl.querySelector('.core-wrap');
      const coreRect = core?.getBoundingClientRect();
      const mapRect = mapEl.getBoundingClientRect();
      const realVisible = isRealSignalVisible();
      layer.classList.toggle('has-real-signals', realVisible);
      if (!coreRect || realVisible) return;

      const cx = coreRect.left - mapRect.left + coreRect.width / 2;
      const cy = coreRect.top - mapRect.top + coreRect.height / 2;
      const w = mapRect.width, h = mapRect.height;
      const topSafe = 105;
      const bottomSafe = Math.min(190, Math.max(150, h * 0.18));
      const sideSafe = 78;

      signals.forEach(s => {
        const x = Math.max(sideSafe, Math.min(w - sideSafe, cx + s.x));
        const y = Math.max(topSafe, Math.min(h - bottomSafe, cy + s.y));
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
