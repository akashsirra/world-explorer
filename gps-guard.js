(() => {
  'use strict';

  // GPS guard: watchPosition() can legitimately report changing coordinates while
  // the phone is stationary (GPS/Wi-Fi/cell jitter). Live Travel must therefore
  // require spatial + temporal evidence of movement instead of trusting coords.speed.
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

  const bearing = (a, b) => {
    const p = Math.PI / 180;
    const y = Math.sin((b.lng - a.lng) * p) * Math.cos(b.lat * p);
    const x = Math.cos(a.lat * p) * Math.sin(b.lat * p) - Math.sin(a.lat * p) * Math.cos(b.lat * p) * Math.cos((b.lng - a.lng) * p);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

  const wrapped = (success, error, options) => {
    let lastAccepted = null;
    let candidate = null;
    let wasActive = false;

    const reset = () => {
      lastAccepted = null;
      candidate = null;
      wasActive = false;
    };

    const guarded = (pos) => {
      const c = pos?.coords;
      const lat = Number(c?.latitude), lng = Number(c?.longitude), accuracy = Number(c?.accuracy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const live = active();
      if (!live) {
        reset();
        return;
      }
      if (!wasActive) {
        lastAccepted = null;
        candidate = null;
      }
      wasActive = true;

      if (Number.isFinite(accuracy) && accuracy > 80) return;

      const next = { lat, lng };
      const speed = Number(c?.speed);
      const hasSpeed = Number.isFinite(speed) && speed >= 0;

      // First fix establishes the stationary/ride anchor. It is not movement.
      if (!lastAccepted) {
        lastAccepted = next;
        candidate = null;
        success?.(pos);
        return;
      }

      const d = dist(lastAccepted, next);
      const uncertainty = Number.isFinite(accuracy) ? accuracy : 10;
      const fastEnough = hasSpeed && speed >= 2.0; // ~7.2 km/h; speed below this is not trusted alone.
      const stepThreshold = Math.min(22, Math.max(fastEnough ? 8 : 12, uncertainty * (fastEnough ? 0.9 : 1.15)));

      // A single jump is never enough to move the rider.
      if (d < stepThreshold) {
        candidate = null;
        return;
      }

      // Require two spatially consistent fixes before declaring real movement.
      // Random stationary GPS jitter rarely produces two sufficiently large,
      // similarly-directed steps in a row.
      if (!candidate) {
        candidate = {
          point: next,
          heading: bearing(lastAccepted, next),
          timestamp: Number(pos.timestamp) || Date.now()
        };
        return;
      }

      const d2 = dist(candidate.point, next);
      const heading2 = bearing(candidate.point, next);
      const total = dist(lastAccepted, next);
      const corroborated = d2 >= Math.max(5, stepThreshold * 0.45)
        && total >= Math.max(16, stepThreshold + 4)
        && angleDiff(candidate.heading, heading2) <= 70;

      if (!corroborated) {
        candidate = d >= stepThreshold ? {
          point: next,
          heading: bearing(lastAccepted, next),
          timestamp: Number(pos.timestamp) || Date.now()
        } : null;
        return;
      }

      // Confirmed movement only: the Core/trail never animate on the first jump.
      lastAccepted = next;
      candidate = null;
      success?.(pos);
    };

    return originalWatch(guarded, error, options);
  };

  geo.watchPosition = wrapped;
  geo.clearWatch = originalClear;
  Object.defineProperty(geo, '__weGpsGuard', { value: true, configurable: false });
})();
