import { cp, mkdir, rm } from 'node:fs/promises';

const out = 'public';
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/vendor`, { recursive: true });

for (const file of ['index.html', 'style.css', 'app.js', 'sw.js', 'manifest.webmanifest']) {
  await cp(file, `${out}/${file}`);
}

await cp('node_modules/leaflet/dist/leaflet.js', `${out}/vendor/leaflet.js`);
await cp('node_modules/leaflet/dist/leaflet.css', `${out}/vendor/leaflet.css`);

console.log('World Explorer build ready:', out);
