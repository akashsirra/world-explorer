(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const KEY = 'we-v5';
  const OLD_KEY = 'we-v4';
  const CLAIM_RADIUS = 150;
  const WEATHER_REFRESH_MS = 5 * 60 * 1000;

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || 'null');
  } catch (_) {}

  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const S = {
    lat: clamp(finite(saved?.lat, 17.385), -90, 90),
    lng: clamp(finite(saved?.lng, 78.4867), -180, 180),
    weather: null,
    items: Array.isArray(saved?.items) ? saved.items : [],
    visited: new Set(Array.isArray(saved?.visited) ? saved.visited : []),
    markers: [],
    heading: 0,
    manualMode: saved?.manualMode === 'day' || saved?.manualMode === 'night' ? saved.manualMode : 'auto',
    weatherBusy: false,
    searchController: null
  };

  const map = L.map('map', {
    zoomControl: false,
    preferCanvas: true,
    fadeAnimation: true,
    worldCopyJump: true
  }).setView([S.lat, S.lng], clamp(finite(saved?.zoom, 15), 3, 19));

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  });
  const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '© OpenStreetMap contributors © CARTO'
  });
  osm.addTo(map);
  let tileFallback = false;
  osm.on('tileerror', () => {
    if (!tileFallback) {
      tileFallback = true;
      map.removeLayer(osm);
      carto.addTo(map);
      toast('Switching map source…');
    }
  });

  const me = L.marker([S.lat, S.lng], {
    icon: L.divIcon({
      className: '',
      html: '<div class="core-wrap"><div class="core-aura"></div><div class="core-orbit o1"></div><div class="core-orbit o2"></div><div class="core"><span></span></div><i class="core-arrow"></i></div>',
      iconSize: [92, 92],
      iconAnchor: [46, 46]
    }),
    zIndexOffset: 2000
  }).addTo(map);

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        lat: S.lat,
        lng: S.lng,
        zoom: map.getZoom(),
        items: S.items,
        visited: [...S.visited],
        manualMode: S.manualMode
      }));
    } catch (_) {}
  }

  function toast(message) {
    const element = $('#toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2300);
  }

  function mode() {
    if (S.manualMode === 'night' || S.manualMode === 'day') return S.manualMode;
    if (S.weather && typeof S.weather.is_day === 'number') return S.weather.is_day ? 'day' : 'night';
    const date = new Date();
    const hour = date.getHours() + date.getMinutes() / 60;
    return hour < 6 ? 'night' : hour < 8 ? 'dawn' : hour < 18 ? 'day' : hour < 20 ? 'dusk' : 'night';
  }

  function time() {
    const currentMode = mode();
    $('#shade').className = 'shade ' + currentMode;
    $('#toggle').textContent = S.manualMode === 'auto' ? (currentMode === 'night' ? '☀' : '☾') : S.manualMode === 'night' ? '☀' : '◐';
    document.body.dataset.mode = currentMode;
  }

  function kind(weather) {
    if (!weather) return 'clear';
    const code = Number(weather.weather_code);
    if (code === 0) return 'clear';
    if (code <= 3) return 'cloud';
    if (code <= 48) return 'fog';
    if (code <= 57) return 'drizzle';
    if (code <= 82) return 'rain';
    if (code <= 86) return 'snow';
    return 'storm';
  }

  const pool = {
    clear: ['☀️', '🌿', '💎', '🦋', '🎨'],
    cloud: ['☁️', '☕', '💎', '🗿', '✨'],
    rain: ['🌧️', '🌱', '💧', '☕', '💎'],
    storm: ['⛈️', '⚡', '🗿', '💎', '🌪️'],
    snow: ['❄️', '💎', '🏔️', '🧊', '✨'],
    fog: ['🌫️', '🗿', '👁️', '✨', '🌲'],
    drizzle: ['🌦️', '🌱', '☕', '💧', '✨']
  };
  const names = ['Trail Spark', 'Local Secret', 'Hidden Echo', 'Celestial Cache', 'Wild Relic', 'Sky Fragment', 'Forgotten Corner', 'Prism Relic'];

  function rnd(value) {
    const x = Math.sin(value * 99991.17) * 43758.5453;
    return x - Math.floor(x);
  }

  function seed() {
    const now = new Date();
    return Math.round(S.lat * 100) + Math.round(S.lng * 100) * 17 + now.getDate() * 31 + now.getHours();
  }

  function clearMarkers() {
    S.markers.forEach((marker) => map.removeLayer(marker));
    S.markers = [];
  }

  function generateDiscoveries() {
    clearMarkers();
    const weatherKind = kind(S.weather);
    const icons = pool[weatherKind] || pool.clear;
    const zoom = map.getZoom();
    const count = zoom < 10 ? 5 : zoom < 13 ? 7 : 9;
    const baseSeed = seed();
    let nearby = 0;

    // Discoveries are anchored to the Explorer Core, not the map center.
    // This prevents panning the map from moving the game world underneath the player.
    for (let i = 0; i < count; i++) {
      const q = baseSeed + i * 97;
      const angle = rnd(q) * Math.PI * 2;
      let distanceDegrees;
      if (zoom >= 14) distanceDegrees = 0.00035 + rnd(q + 7) * 0.0042; // ~40–500 m
      else if (zoom >= 12) distanceDegrees = 0.001 + rnd(q + 7) * 0.009; // ~110 m–1 km
      else distanceDegrees = 0.008 + rnd(q + 7) * 0.045; // broader scouting view

      const lat = clamp(S.lat + Math.sin(angle) * distanceDegrees, -89.9, 89.9);
      const lng = S.lng + Math.cos(angle) * distanceDegrees / Math.max(0.35, Math.cos(S.lat * Math.PI / 180));
      const rare = rnd(q + 9) > 0.82;
      const icon = icons[i % icons.length];
      const id = [lat.toFixed(4), lng.toFixed(4), weatherKind, mode(), Math.floor(q)].join(':');
      const html = '<button class="marker ' + (rare ? 'rare' : '') + '" aria-label="Discovery">' + icon + '<span></span></button>';
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({ className: '', html, iconSize: [74, 74], iconAnchor: [37, 37] })
      }).addTo(map);

      marker.on('click', () => claim(id, names[(i + S.items.length) % names.length], icon, rare, lat, lng));
      S.markers.push(marker);
      if (distance(S.lat, S.lng, lat, lng) <= CLAIM_RADIUS) nearby++;
    }

    $('#near').innerHTML = nearby + ' <small>✦</small>';
    $('#scan').textContent = '✦ ' + count + ' signals';
  }

  function distance(lat1, lng1, lat2, lng2) {
    const radius = 6371000;
    const rad = (value) => value * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(clamp(a, 0, 1)));
  }

  function claim(id, name, icon, rare, lat, lng) {
    if (S.visited.has(id)) {
      toast('Already explored ✦');
      return;
    }
    const meters = distance(S.lat, S.lng, lat, lng);
    if (meters > CLAIM_RADIUS) {
      toast('Move closer · ' + Math.round(meters) + ' m away');
      return;
    }

    S.visited.add(id);
    S.items.unshift({
      id, name, icon, rare, lat, lng,
      time: new Date().toISOString(),
      weather: weatherText(),
      mode: mode()
    });
    save();
    updateHud();
    generateDiscoveries();
    toast((rare ? '✨ Rare find: ' : '✦ Discovery: ') + name);
  }

  function weatherText() {
    if (!S.weather) return 'Unknown skies';
    const labels = { clear: 'Clear', cloud: 'Cloudy', fog: 'Misty', drizzle: 'Drizzle', rain: 'Rainy', snow: 'Snowy', storm: 'Stormy' };
    const temperature = Number(S.weather.temperature_2m);
    return (labels[kind(S.weather)] || 'Unknown') + ' · ' + (Number.isFinite(temperature) ? Math.round(temperature) + '°C' : '—');
  }

  function updateHud() {
    const explored = Math.min(100, Math.round(S.visited.size / (S.visited.size + 12) * 100));
    $('#pct').textContent = explored;
    $('#bar').style.width = explored + '%';
    $('#disc').textContent = '✦ ' + S.items.length + ' discoveries';
    const icons = { clear: '☀️', cloud: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', snow: '❄️', storm: '⛈️' };
    $('#wx').textContent = (icons[kind(S.weather)] || '☁') + ' ' + weatherText();
    $('#quest').textContent = S.items.length < 3 ? '🎯 Find 3 discoveries' : S.items.length < 10 ? '🎯 Find 10 discoveries' : '🏆 Explorer quest complete';
  }

  async function weather() {
    if (S.weatherBusy) return;
    S.weatherBusy = true;
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + S.lat.toFixed(4) + '&longitude=' + S.lng.toFixed(4) + '&current=temperature_2m,weather_code,is_day&timezone=auto';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Weather request failed');
      const data = await response.json();
      if (!data.current) throw new Error('Weather response incomplete');
      S.weather = data.current;
      time();
      updateHud();
      generateDiscoveries();
    } catch (_) {
      updateHud();
      generateDiscoveries();
      $('#wx').textContent = '☁ Offline mode';
      time();
    } finally {
      S.weatherBusy = false;
    }
  }

  async function requestOrientationPermission() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') return false;
      }
    } catch (_) {
      return false;
    }
    startHeading();
    return true;
  }

  function locate() {
    if (!navigator.geolocation) {
      toast('Location unavailable');
      return;
    }
    toast('Finding your world…');
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      S.lat = clamp(latitude, -90, 90);
      S.lng = clamp(longitude, -180, 180);
      map.setView([S.lat, S.lng], 16, { animate: true });
      me.setLatLng([S.lat, S.lng]);
      save();
      weather();
      requestOrientationPermission();
      toast(accuracy && accuracy > 100 ? 'Core locked · GPS is approximate' : 'Explorer Core locked on you');
    }, () => toast('Location permission denied'), {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000
    });
  }

  function startHeading() {
    if (!window.DeviceOrientationEvent || S.headingListener) return;
    const listener = (event) => {
      const heading = event.webkitCompassHeading ?? (event.alpha != null ? 360 - event.alpha : null);
      if (heading == null || !Number.isFinite(Number(heading))) return;
      S.heading = Number(heading);
      $('.core-wrap')?.style.setProperty('--heading', S.heading + 'deg');
    };
    S.headingListener = listener;
    try {
      window.addEventListener('deviceorientationabsolute', listener, true);
      window.addEventListener('deviceorientation', listener, true);
    } catch (_) {}
  }

  function renderSheet(tab) {
    $('#sheet').classList.add('open');
    const body = $('#body');
    $('#title').textContent = tab[0].toUpperCase() + tab.slice(1);

    if (tab === 'discover') {
      body.innerHTML = '<div class="hero"><div class="hero-icon">🧭</div><div><h3>The world is a game</h3><p>Move through real places. Weather, time and your position change what you can discover.</p></div></div><div class="cards"><button class="card" id="hunt"><div class="big">✦</div><div><b>Scan the area</b><small>Reveal a fresh ring of signals</small></div></button><div class="card"><div class="big">' + ($('#wx').textContent.split(' ')[0] || '☁') + '</div><div><b>' + weatherText() + '</b><small>Current conditions shape your discoveries.</small></div></div></div>';
      $('#hunt').onclick = () => {
        generateDiscoveries();
        toast('New signals detected ✦');
        $('#sheet').classList.remove('open');
      };
      return;
    }

    if (tab === 'memories') {
      body.innerHTML = S.items.length
        ? '<div class="cards">' + S.items.map((item) => '<div class="card"><div class="big">' + item.icon + '</div><div><b>' + item.name + (item.rare ? ' · ✦ Rare' : '') + '</b><small>' + item.weather + ' · ' + item.mode + '</small></div></div>').join('') + '</div>'
        : '<div class="empty">No memories yet.<br><br>Walk toward a signal and claim it.</div>';
      return;
    }

    body.innerHTML = '<div class="hero"><div class="hero-icon">💠</div><div><h3>Explorer Core</h3><p>Your progress is stored on this device. Keep exploring to complete your world.</p></div></div><div class="grid"><div class="stat"><b>' + S.items.length + '</b>Discoveries</div><div class="stat"><b>' + S.items.filter((item) => item.rare).length + '</b>Rare finds</div><div class="stat"><b>' + $('#pct').textContent + '%</b>Explored</div><div class="stat"><b>' + S.items.filter((item) => item.mode === 'night').length + '</b>Night finds</div></div>';
  }

  $$('.nav-btn').forEach((button) => button.onclick = () => {
    $$('.nav-btn').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.tab === 'map') $('#sheet').classList.remove('open');
    else renderSheet(button.dataset.tab);
  });

  $('#loc').onclick = locate;
  $('#center').onclick = () => {
    map.setView([S.lat, S.lng], 16, { animate: true });
    toast('Explorer Core centered');
  };
  $('#refresh').onclick = () => {
    generateDiscoveries();
    toast('Signals reshuffled ✦');
  };
  $('#weather').onclick = () => {
    weather();
    toast('Reading the sky…');
  };
  $('#toggle').onclick = () => {
    S.manualMode = S.manualMode === 'auto' ? 'night' : S.manualMode === 'night' ? 'day' : 'auto';
    time();
    generateDiscoveries();
    save();
    toast(S.manualMode === 'auto' ? 'Automatic day/night' : 'Manual ' + S.manualMode + ' view');
  };
  $('#scan').onclick = () => {
    generateDiscoveries();
    toast('Scanning your surroundings…');
  };
  $('#close').onclick = () => $('#sheet').classList.remove('open');
  $('#sheet').addEventListener('click', (event) => {
    if (event.target === $('#sheet')) $('#sheet').classList.remove('open');
  });

  $('#search').onkeydown = async (event) => {
    if (event.key !== 'Enter') return;
    const query = event.target.value.trim();
    if (!query) return;
    S.searchController?.abort();
    S.searchController = new AbortController();
    toast('Searching the world…');
    try {
      const response = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(query), {
        headers: { 'Accept-Language': 'en' },
        signal: S.searchController.signal
      });
      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();
      if (!results.length) {
        toast('Place not found');
        return;
      }
      S.lat = clamp(Number(results[0].lat), -90, 90);
      S.lng = clamp(Number(results[0].lon), -180, 180);
      map.setView([S.lat, S.lng], 15, { animate: true });
      me.setLatLng([S.lat, S.lng]);
      save();
      weather();
      toast('Exploring ' + String(results[0].display_name || query).split(',')[0]);
    } catch (error) {
      if (error.name !== 'AbortError') toast('Search unavailable');
    }
  };

  map.on('moveend', save);
  map.on('zoomend', generateDiscoveries);
  map.whenReady(() => setTimeout(() => {
    $('#mapLoading')?.classList.add('hidden');
    map.invalidateSize(true);
  }, 350));

  time();
  updateHud();
  generateDiscoveries();
  startHeading();
  weather();
  setTimeout(() => map.invalidateSize(true), 800);
  setInterval(weather, WEATHER_REFRESH_MS);
})();
