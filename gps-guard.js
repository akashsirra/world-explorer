(() => {
  'use strict';

  // GPS guard: prevent permission-granted background watches and stationary GPS drift
  // from moving the Explorer Core. Real movement is passed through to the ride engine.
  if (!navigator.geolocation || navigator.geolocation.__weGpsGuard) return;

  const geo = navigator.geolocation;
  const originalWatch = geo.watchPosition.bind(geo);
  const originalClear = geo.clearWatch.bind(geo);
  const active = () => document.getElementById('travelSide')?.classList.contains('active') || document.getElementById('travel')?.classList.contains('active');
  const dist = (a, b) => {
    const R = 6371000, p = Math.PI / 180;
    const dLat = (b.lat - a.lat) * p, dLng = (b.lng - a.lng) * p;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(Math.min(1, x)));
  };

  const wrapped = (success, error, options) => {
    let last = null;
    let wasActive = false;

    const guarded = (pos) => {
      const c = pos?.coords;
      const lat = Number(c?.latitude), lng = Number(c?.longitude), accuracy = Number(c?.accuracy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const live = active();
      if (!live) {
        last = null;
        wasActive = false;
        return;
      }
      if (!wasActive) last = null;
      wasActive = true;

      if (Number.isFinite(accuracy) && accuracy > 80) return;

      const next = { lat, lng };
      const speed = Number(c?.speed);
      if (last) {
        const d = dist(last, next);
        // GPS can wander several metres while the phone is completely still.
        // Require a larger displacement when speed is low or GPS accuracy is poor.
        const lowSpeed = !Number.isFinite(speed) || speed < 2.0;
        const threshold = lowSpeed
          ? Math.min(18, Math.max(8, (Number.isFinite(accuracy) ? accuracy * 0.35 : 8)))
          : 3;
        if (d < threshold) return;
        if (d > 250 && (!Number.isFinite(speed) || speed < 7)) return;
      }

      last = next;
      success?.(pos);
    };

    return originalWatch(guarded, error, options);
  };

  geo.watchPosition = wrapped;
  geo.clearWatch = originalClear;
  Object.defineProperty(geo, '__weGpsGuard', { value: true, configurable: false });
})();
