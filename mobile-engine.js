/* World Explorer v15 — mobile discovery decluttering */
(() => {
  if (!window.L || window.__WE_MOBILE_ENGINE__) return;
  window.__WE_MOBILE_ENGINE__ = true;

  const originalMarker = L.marker;
  const discoveryMarkers = new Set();
  let frame = 0;

  const isDiscovery = (options) => {
    const html = options?.icon?.options?.html || '';
    return html.includes('class="marker');
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const live = [...discoveryMarkers].filter((m) => m._map && m._icon);
      const occupied = [];

      live.forEach((marker) => {
        const point = marker._map.latLngToContainerPoint(marker.getLatLng());
        const size = Math.max(52, Math.min(62, window.innerWidth * 0.085));
        const half = size / 2;
        const safeBottom = Math.min(410, window.innerHeight * 0.30);
        const hiddenByHud = point.y > window.innerHeight - safeBottom;

        let overlaps = hiddenByHud;
        if (!overlaps) {
          for (const other of occupied) {
            const dx = point.x - other.x;
            const dy = point.y - other.y;
            if (Math.hypot(dx, dy) < Math.max(size, other.size) * 0.92) {
              overlaps = true;
              break;
            }
          }
        }

        marker._icon.classList.toggle('we-declutter-hidden', overlaps);
        if (!overlaps) occupied.push({ x: point.x, y: point.y, size: half * 2 });
      });
    });
  };

  L.marker = function (latlng, options = {}, ...rest) {
    if (!isDiscovery(options)) return originalMarker.call(this, latlng, options, ...rest);

    const icon = options.icon;
    if (icon?.options) {
      icon.options.iconSize = [58, 58];
      icon.options.iconAnchor = [29, 29];
    }

    const marker = originalMarker.call(this, latlng, options, ...rest);
    discoveryMarkers.add(marker);
    marker.on('remove', () => {
      discoveryMarkers.delete(marker);
      schedule();
    });
    marker.on('add', schedule);
    schedule();
    return marker;
  };

  const originalSetView = L.Map.prototype.setView;
  L.Map.prototype.setView = function (...args) {
    const result = originalSetView.apply(this, args);
    schedule();
    return result;
  };

  const originalAddLayer = L.Map.prototype.addLayer;
  L.Map.prototype.addLayer = function (layer) {
    const result = originalAddLayer.call(this, layer);
    if (discoveryMarkers.has(layer)) schedule();
    return result;
  };

  document.addEventListener('DOMContentLoaded', () => {
    const attach = () => {
      const mapEl = document.getElementById('map');
      if (!mapEl) return;
      const observer = new MutationObserver(schedule);
      observer.observe(mapEl, { childList: true, subtree: true });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('orientationchange', () => setTimeout(schedule, 150), { passive: true });
    };
    attach();
  });
})();
