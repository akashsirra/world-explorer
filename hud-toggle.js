(() => {
  const hud = document.getElementById('explorerHud');
  const button = document.getElementById('hudToggle');
  const pct = document.getElementById('pct');
  const near = document.getElementById('near');
  if (!hud || !button) return;

  const STORAGE_KEY = 'world-explorer-hud-collapsed';

  const updateSummary = () => {
    const p = pct?.textContent?.trim() || '0';
    const n = near?.textContent?.trim() || '0';
    const row = hud.querySelector('.handle-row');
    if (row) row.setAttribute('data-summary', `${p}% explored  •  ${n} nearby`);
  };

  const setCollapsed = (collapsed, persist = true) => {
    hud.classList.toggle('hud-collapsed', collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expand explorer panel' : 'Minimize explorer panel');
    button.setAttribute('title', collapsed ? 'Expand explorer panel' : 'Minimize explorer panel');
    button.textContent = collapsed ? '⌃' : '⌄';
    updateSummary();
    if (persist) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    window.dispatchEvent(new CustomEvent('world-explorer:hud-toggle', { detail: { collapsed } }));
  };

  const toggle = (event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    setCollapsed(!hud.classList.contains('hud-collapsed'));
  };

  button.addEventListener('click', toggle);
  hud.addEventListener('click', (event) => {
    if (!hud.classList.contains('hud-collapsed') || event.target.closest('.hud-toggle')) return;
    toggle(event);
  });

  if (pct || near) {
    const observer = new MutationObserver(updateSummary);
    [pct, near].filter(Boolean).forEach(el => observer.observe(el, {childList:true,subtree:true,characterData:true}));
  }

  setCollapsed(localStorage.getItem(STORAGE_KEY) === '1', false);
})();
