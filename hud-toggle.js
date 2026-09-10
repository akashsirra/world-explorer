(() => {
  const hud = document.getElementById('explorerHud');
  const button = document.getElementById('hudToggle');
  if (!hud || !button) return;

  const STORAGE_KEY = 'world-explorer-hud-collapsed';

  const setCollapsed = (collapsed, persist = true) => {
    hud.classList.toggle('hud-collapsed', collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expand explorer panel' : 'Minimize explorer panel');
    button.setAttribute('title', collapsed ? 'Expand explorer panel' : 'Minimize explorer panel');
    button.textContent = collapsed ? '⌃' : '⌄';
    if (persist) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    window.dispatchEvent(new CustomEvent('world-explorer:hud-toggle', { detail: { collapsed } }));
  };

  const toggle = (event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    setCollapsed(!hud.classList.contains('hud-collapsed'));
  };

  button.addEventListener('click', toggle);

  // The compact bar is also a large, easy-to-hit target when minimized.
  hud.addEventListener('click', (event) => {
    if (!hud.classList.contains('hud-collapsed')) return;
    if (event.target.closest('.hud-toggle')) return;
    toggle(event);
  });

  setCollapsed(localStorage.getItem(STORAGE_KEY) === '1', false);
})();
