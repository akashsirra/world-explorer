/* World Explorer v23 — living signal layer */
(() => {
  'use strict';
  const boot = () => {
    const map = document.getElementById('map');
    if (!map || map.__weSignalPolish) return;
    map.__weSignalPolish = true;

    const refresh = () => {
      const signals = [...map.querySelectorAll('.radar-signal, .radar-ambient-signal')];
      signals.forEach((el, i) => {
        el.style.setProperty('--signal-delay', `${(i * 0.16).toFixed(2)}s`);
        el.style.setProperty('--signal-index', i);
      });
    };

    const reveal = () => {
      map.classList.remove('signal-scan-active');
      void map.offsetWidth;
      map.classList.add('signal-scan-active');
      window.clearTimeout(map.__weSignalTimer);
      map.__weSignalTimer = window.setTimeout(() => map.classList.remove('signal-scan-active'), 4300);
    };

    new MutationObserver(refresh).observe(map, { childList: true, subtree: true });
    document.getElementById('scan')?.addEventListener('click', reveal);
    document.getElementById('refresh')?.addEventListener('click', reveal);
    refresh();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500));
  else setTimeout(boot, 500);
})();
