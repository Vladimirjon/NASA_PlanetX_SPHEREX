/* Static package of the original landing, with CPU-prerendered satellite views. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'landing');
const out = path.join(root, 'dist', 'landing');
const viewerSource = path.join(root, 'frontend', 'dist-copernix');

const files = [
  'index.html',
  'favicon-32.png',
  'favicon-192.png',
  'apple-touch-icon.png',
  'css/styles.css',
  'js/app.js',
  'js/i18n.js',
  'js/sat3d.js',
  'js/sat-gl.js',
  'lib/three.module.min.js',
  'lib/addons/loaders/GLTFLoader.js',
  'lib/addons/utils/BufferGeometryUtils.js',
  'model/spherex.gltf',
  'model/spherex.bin',
  'js/render-scheduler.js',
  'assets/manifest.json',
];
for (const dir of ['assets', 'fonts', 'assets/spherex-views', 'model']) {
  for (const file of fs.readdirSync(path.join(source, dir))) {
    if ((dir !== 'model' && /\.(webp|woff2)$/.test(file)) || (dir === 'model' && /\.webp$/.test(file)) || (dir.endsWith('spherex-views') && file === 'manifest.json')) {
      files.push(`${dir}/${file}`);
    }
  }
}

fs.rmSync(out, {recursive: true, force: true});
let bytes = 0;
for (const file of files) {
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(source, file), target);
  bytes += fs.statSync(target).size;
}

let viewerNote = 'viewer/ omitted (run mise run copernix-build first)';
if (fs.existsSync(viewerSource)) {
  const viewerOut = path.join(out, 'viewer');
  fs.cpSync(viewerSource, viewerOut, {recursive: true});
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else bytes += fs.statSync(full).size;
    }
  };
  walk(viewerOut);
  // the viewer fetches the offline demo from /demo (absolute), so a static host needs it at the root too
  const demoSource = path.join(root, 'frontend', 'public', 'demo');
  if (fs.existsSync(demoSource)) {
    fs.cpSync(demoSource, path.join(out, 'demo'), {recursive: true});
    walk(path.join(out, 'demo'));
  }
  viewerNote = 'viewer/ and demo/ included (static hosting works without the API, offline demo of the five objects)';
}

console.log(
  `Built ${files.length} static files (${(bytes / 1024).toFixed(0)} KiB); ${viewerNote}; satellite views load individually on demand.`,
);