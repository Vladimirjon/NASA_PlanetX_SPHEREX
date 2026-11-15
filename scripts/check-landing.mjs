/* Dependency-free static validation, including the active JavaScript import graph. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','landing');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g)){
  if(/^(https?:|mailto:)/.test(match[1])||match[1].startsWith('viewer/')||match[1].startsWith('/viewer'))continue;
  assert.ok(fs.existsSync(path.join(root,match[1])),`Missing HTML resource: ${match[1]}`);
}
const visited=new Set();
function inspect(file){
  if(visited.has(file))return;visited.add(file);
  const code=fs.readFileSync(file,'utf8');
  // Only the lazily loaded real-time satellite (js/sat-gl.js) may touch WebGL, and only behind the safeguards asserted below.
  assert.ok(!/WebGLRenderer|webgl2?['"]|requestAdapter\(/.test(code),`Unexpected GPU initialization: ${file}`);
  const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
  for(const m of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g))inspect(path.resolve(path.dirname(file),m[1]));
}
inspect(path.join(root,'js/app.js'));
const bundle=path.resolve(root,'..','dist','landing');
if(fs.existsSync(bundle)){
  for(const file of visited){
    const relative=path.relative(root,file);
    assert.ok(fs.existsSync(path.join(bundle,relative)),`Missing bundled JavaScript dependency: ${relative}`);
  }
}
for(const name of ['styles.css']){
  const css=fs.readFileSync(path.join(root,'css',name),'utf8');
  for(const match of css.matchAll(/backdrop-filter\s*:\s*([^;}]+)/g))assert.equal(match[1].trim(),'none','Backdrop blur reintroduced');
  for(const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g))assert.ok(fs.existsSync(path.resolve(root,'css',m[1])),`Missing CSS asset: ${m[1]}`);
}
const {D}=await import(pathToFileURL(path.join(root,'js/i18n.js')));
assert.deepEqual(Object.keys(D.en).sort(),Object.keys(D.es).sort(),'Translation key mismatch');
for(const m of html.matchAll(/data-i(?:a)?="([^"]+)"/g))assert.ok(m[1] in D.en,`Missing translation: ${m[1]}`);
const art=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));
assert.deepEqual(Object.keys(art.rotation).sort(),Object.keys(art.objects).sort(),'Every portrait needs a rotation sprite');
for(const file of [...Object.values(art.objects),...Object.values(art.rotation)]){
  assert.ok(fs.existsSync(path.join(root,'assets',file)),`Missing image: ${file}`);
  if(fs.existsSync(bundle))assert.ok(fs.existsSync(path.join(bundle,'assets',file)),`Missing bundled image: ${file}`);
}
const gl=fs.readFileSync(path.join(root,'js/sat-gl.js'),'utf8');
for(const rule of [/failIfMajorPerformanceCaveat/,/powerPreference:'low-power'/,/MAX_PIXELS/,/webglcontextlost/,/gl=0/])assert.ok(rule.test(gl),`sat-gl.js lost a safeguard: ${rule}`);
assert.ok(!/high-performance|PMREMGenerator|shadowMap/.test(gl),'sat-gl.js must stay light: no high-performance, PMREM or shadows');
assert.ok(/importmap/.test(html)&&/"three"/.test(html),'index.html needs the import map for three');
console.log(`PASS: syntax, local resources, ES/EN parity, ${visited.size} active modules without WebGL (real-time 3D is lazy and guarded), no backdrop filters`);

const views=JSON.parse(fs.readFileSync(path.join(root,'assets/spherex-views/manifest.json'),'utf8'));
for(let p=0;p<views.pitchDegrees.length;p++)for(let y=0;y<views.yawFrames;y++)assert.ok(fs.existsSync(path.join(root,'assets/spherex-views',p+'-'+String(y).padStart(2,'0')+'.webp')));
const {VIEWS}=await import(pathToFileURL(path.join(root,'js/sat3d.js')));
assert.equal(VIEWS.yaw,views.yawFrames,'sat3d.js and the views manifest disagree on yaw frames');
assert.deepEqual(VIEWS.pitchDegrees,views.pitchDegrees,'sat3d.js and the views manifest disagree on tilts');
console.log(`PASS: all ${views.yawFrames*views.pitchDegrees.length} satellite views present and match sat3d.js`);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viewerDist = path.join(repoRoot, 'frontend', 'dist-copernix');
if (fs.existsSync(viewerDist)) {
  const viewerIndex = path.join(viewerDist, 'index.html');
  assert.ok(fs.existsSync(viewerIndex), 'Missing frontend/dist-copernix/index.html');
  const viewerHtml = fs.readFileSync(viewerIndex, 'utf8');
  for (const match of viewerHtml.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
    const url = match[1];
    if (/^(https?:|data:|mailto:)/.test(url)) continue;
    assert.ok(
      url.startsWith('/viewer/') || url.startsWith('viewer/'),
      `Viewer index must reference /viewer/ paths only, got: ${url}`,
    );
  }
  console.log('PASS: viewer build uses /viewer/-scoped asset paths');
}
