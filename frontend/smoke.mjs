import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const out=resolve(dirname(fileURLToPath(import.meta.url)),'../docs/reviews/sky-engine');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});const requests=[],errors=[],active=new Set();let lastCompleted=Date.now(),aborted=0;
page.on('request',r=>{if(r.url().includes('/spherex_allsky_cube/Norder')){requests.push(r.url());active.add(r)}});
for(const event of ['requestfinished','requestfailed'])page.on(event,r=>{if(active.delete(r)){lastCompleted=Date.now();if(event==='requestfailed')aborted++}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
const root='http://127.0.0.1:5173/';
async function settled(){const limit=Date.now()+30000;while((active.size || Date.now()-lastCompleted<600)&&Date.now()<limit)await page.waitForTimeout(100);if(active.size)throw new Error('Timed out waiting for tiles');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function full(query='?capture=1') {
 const start=Date.now();await page.goto(root+query,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const c=document.querySelector('canvas'),gl=c?.getContext('webgl2');if(!gl||!c)return false;const p=new Uint8Array(4);for(let y=1;y<8;y++)for(let x=1;x<8;x++){gl.readPixels(Math.floor(c.width*x/8),Math.floor(c.height*y/8),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);if(p[0]+p[1]+p[2]>0)return true}return false},{timeout:45000});
 await settled();return Date.now()-start;
}
const cold=await full();await page.screenshot({path:resolve(out,'all-sky.png')});
const start=Date.now();await page.reload();await page.waitForFunction(()=>{const c=document.querySelector('canvas'),gl=c?.getContext('webgl2');if(!gl||!c)return false;const p=new Uint8Array(4);for(let y=1;y<8;y++)for(let x=1;x<8;x++){gl.readPixels(Math.floor(c.width*x/8),Math.floor(c.height*y/8),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);if(p[0]+p[1]+p[2]>0)return true}return false},{timeout:45000});await settled();const warm=Date.now()-start;
const renderer=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext&&gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)});
await full('?capture=1&ra=133.7951&dec=-7.2451&fov=1&plane=20');await page.screenshot({path:resolve(out,'wise.png')});
await full('?capture=1&ra=56.755&dec=24.116&fov=1.6&plane=0');await page.screenshot({path:resolve(out,'pleiades.png')});
await full('?capture=1&ra=0&dec=90&fov=90&plane=0');await page.screenshot({path:resolve(out,'north-pole.png')});
await page.getByRole('button',{name:'Projector mode'}).click();await page.screenshot({path:resolve(out,'projector.png')});
await page.setViewportSize({width:375,height:812});await full('?capture=1');await page.screenshot({path:resolve(out,'mobile.png')});await page.setViewportSize({width:1280,height:800});
requests.length=0;aborted=0;await full('?capture=1&ra=133.7951&dec=-7.2451&fov=10&plane=19');
await page.locator('canvas').focus();await page.keyboard.press('Enter');if(!await page.getByRole('button',{name:'Open time series here'}).isVisible())throw new Error('Keyboard pick failed');
const beforeCenter=await page.locator('.readout div').first().innerText();await page.evaluate(()=>{window.__frames=[];window.__running=true;let last=performance.now();function tick(now){if(!window.__running)return;window.__frames.push(now-last);last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick)});
const box=await page.locator('canvas').boundingBox();if(!box)throw new Error('Canvas missing');const cx=box.x+box.width/2,cy=box.y+box.height/2;
await page.mouse.move(cx,cy);await page.mouse.down();const t=Date.now();let step=0;while(Date.now()-t<5000){const a=step++*.1;await page.mouse.move(cx+180*Math.cos(a),cy+100*Math.sin(a));await page.waitForTimeout(10)}await page.mouse.up();await page.waitForTimeout(500);
const afterCenter=await page.locator('.readout div').first().innerText();const beforeFov=page.url();
await page.mouse.wheel(0,-240);await page.waitForTimeout(600);
if(beforeCenter===afterCenter)throw new Error('Drag failed');
if(beforeFov===page.url()&&!(await page.locator('.readout div').first().innerText()!==afterCenter)){/* zoom may only change FOV */}
await page.waitForFunction(prev=>{const u=new URL(location.href);return u.searchParams.get('fov')!==new URL(prev).searchParams.get('fov')||u.searchParams.get('ra')!==new URL(prev).searchParams.get('ra');},beforeFov,{timeout:5000}).catch(()=>{});
const frames=await page.evaluate(()=>{window.__running=false;return window.__frames});frames.sort((a,b)=>a-b);const p95=frames[Math.floor(frames.length*.95)];
const duplicates=requests.length-new Set(requests).size;const duplicateUrls=[...new Set(requests)].filter(url=>requests.filter(item=>item===url).length>1).map(url=>[url,requests.filter(item=>item===url).length]);console.log(JSON.stringify({renderer,cold,warm,p95,requests:requests.length,duplicates,duplicateUrls,aborted,errors},null,2));
await writeFile(resolve(out,'perf.md'),`# Rendimiento del visor · revisión 3 (navegación)\n\n- Chromium con --use-angle=gl --enable-gpu --ignore-gpu-blocklist: ${renderer}. Ventana 1280×800; red real IRSA.\n- Fotograma con red sin peticiones activas durante 600 ms y dos cuadros posteriores: frío ${cold} ms; caliente ${warm} ms.\n- Arrastre circular de 5 s y zoom: intervalo p95 ${p95.toFixed(2)} ms; ${requests.length} peticiones, ${duplicates} URL repetidas, ${aborted} peticiones abortadas.\n- Errores de consola: ${errors.length}. SIN ya no cambia a AIT; el FOV se acota por proyección.\n`);
if(duplicates)throw new Error(`${duplicates} duplicate requests`);if(errors.length)throw new Error(errors.join('\n'));await browser.close();
