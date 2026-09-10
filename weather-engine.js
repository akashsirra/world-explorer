(() => {
  'use strict';

  const WEATHER = {
    '☀️': 'clear', '☁️': 'cloud', '🌫️': 'fog', '🌦️': 'drizzle',
    '🌧️': 'rain', '❄️': 'snow', '⛈️': 'storm', '☁': 'cloud'
  };

  const labels = {
    clear: 'Clear skies', cloud: 'Cloud cover', fog: 'Fog', drizzle: 'Drizzle',
    rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm'
  };

  function ensureLayer() {
    let layer = document.getElementById('weatherFx');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'weatherFx';
      layer.className = 'weather-fx';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function setWeather(kind) {
    const layer = ensureLayer();
    const safe = labels[kind] ? kind : 'clear';
    document.body.dataset.weather = safe;
    layer.dataset.weather = safe;
    layer.className = 'weather-fx weather-' + safe;
    layer.innerHTML = '';

    if (safe === 'rain' || safe === 'drizzle' || safe === 'storm') {
      const drops = safe === 'drizzle' ? 18 : safe === 'storm' ? 48 : 34;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < drops; i++) {
        const drop = document.createElement('i');
        drop.style.setProperty('--x', (Math.random() * 110 - 5).toFixed(1) + '%');
        drop.style.setProperty('--d', (0.45 + Math.random() * 0.65).toFixed(2) + 's');
        drop.style.setProperty('--delay', (-Math.random() * 1.2).toFixed(2) + 's');
        drop.style.setProperty('--len', (12 + Math.random() * 20).toFixed(0) + 'px');
        frag.appendChild(drop);
      }
      layer.appendChild(frag);
    }

    if (safe === 'snow') {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 28; i++) {
        const flake = document.createElement('i');
        flake.style.setProperty('--x', (Math.random() * 110 - 5).toFixed(1) + '%');
        flake.style.setProperty('--size', (2 + Math.random() * 5).toFixed(1) + 'px');
        flake.style.setProperty('--d', (5 + Math.random() * 7).toFixed(1) + 's');
        flake.style.setProperty('--delay', (-Math.random() * 7).toFixed(1) + 's');
        frag.appendChild(flake);
      }
      layer.appendChild(frag);
    }
  }

  function readWeather() {
    const wx = document.getElementById('wx');
    if (!wx) return;
    const text = wx.textContent || '';
    const icon = Object.keys(WEATHER).find(key => text.includes(key));
    if (icon) setWeather(WEATHER[icon]);
  }

  const start = () => {
    ensureLayer();
    readWeather();
    const wx = document.getElementById('wx');
    if (wx) new MutationObserver(readWeather).observe(wx, { childList: true, characterData: true, subtree: true });
    window.addEventListener('worldexplorer:weather', e => setWeather(e.detail?.kind));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
