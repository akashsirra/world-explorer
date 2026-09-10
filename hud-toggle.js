(() => {
  const hud = document.getElementById('explorerHud');
  const button = document.getElementById('hudToggle');
  if (!hud || !button) return;

  const STORAGE_KEY = 'world-explorer-hud-collapsed';

  const setCollapsed = (collapsed, persist = true) => {
    hud.classList.toggle('hud-collapsed', collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Maximize explorer panel' : 'Minimize explorer panel');
    button.setAttribute('title', collapsed ? 'Maximize' : 'Minimize');
    button.textContent = collapsed ? '⌃' : '⌄';
    if (persist) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    window.dispatchEvent(new CustomEvent('world-explorer:hud-toggle', { detail: { collapsed } }));
  };

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setCollapsed(!hud.classList.contains('hud-collapsed'));
  });

  // Start expanded so first-time explorers see the full experience.
  setCollapsed(localStorage.getItem(STORAGE_KEY) === '1', false);
})();
