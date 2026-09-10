import { cp, mkdir, rm } from 'node:fs/promises';

const out = 'public';
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/vendor`, { recursive: true });

// Keep every runtime asset referenced by index.html in the production bundle.
for (const file of [
  'index.html',
  'style.css',
  'ui-overrides.css',
  'weather.css',
  'app.js',
  'mobile-engine.js',
  'radar-visibility.js',
  'hud-toggle.js',
  'weather-engine.js',
  'sw.js',
  'manifest.webmanifest'
]) {
  await cp(file, `${out}/${file}`);
}

await cp('node_modules/leaflet/dist/leaflet.js', `${out}/vendor/leaflet.js`);
await cp('node_modules/leaflet/dist/leaflet.css', `${out}/vendor/leaflet.css`);

console.log('World Explorer build ready:', out);
