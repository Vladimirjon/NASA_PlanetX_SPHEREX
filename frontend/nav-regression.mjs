import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/reviews/sky-engine');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const root = 'http://127.0.0.1:5173/';

async function waitSky() {
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    const gl = c?.getContext('webgl2');
    if (!gl || !c) return false;
    const p = new Uint8Array(4);
    for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) {
      gl.readPixels(Math.floor(c.width * x / 8), Math.floor(c.height * y / 8), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
      if (p[0] + p[1] + p[2] > 0) return true;
    }
    return false;
  }, { timeout: 45000 });
}

await page.goto(`${root}?capture=1&proj=SIN&fov=1&ra=180&dec=-58`, { waitUntil: 'domcontentloaded' });
await waitSky();
await page.locator('canvas').focus();
for (let i = 0; i < 48; i++) {
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.waitForTimeout(30);
}
await page.waitForTimeout(400);
const url = page.url();
if (!url.includes('proj=SIN')) throw new Error(`Projection switched implicitly: ${url}`);
const fov = Number(new URL(url).searchParams.get('fov'));
if (!(fov > 100 && fov <= 180.0001)) throw new Error(`Expected SIN FOV clamped near hemisphere, got ${fov}`);
await page.screenshot({ path: resolve(out, 'sin-hemisphere.png') });

// Disc vs ellipse: corners of the canvas should stay near-black for SIN hemisphere.
const cornerDark = await page.locator('canvas').evaluate(c => {
  const gl = c.getContext('webgl2');
  if (!gl) return false;
  const p = new Uint8Array(4);
  const samples = [[2, 2], [c.width - 3, 2], [2, c.height - 3], [c.width - 3, c.height - 3]];
  let dark = 0;
  for (const [x, y] of samples) {
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
    if (p[0] + p[1] + p[2] < 8) dark++;
  }
  return dark >= 3;
});
if (!cornerDark) throw new Error('SIN at ~180° does not look like a disc (corners not dark)');

await page.goto(`${root}?capture=1&ra=10&dec=88&fov=30&proj=SIN`, { waitUntil: 'domcontentloaded' });
await waitSky();
const box = await page.locator('canvas').boundingBox();
if (!box) throw new Error('canvas missing');
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.locator('canvas').focus();
const beforeCenter = await page.locator('.readout div').first().innerText();
await page.mouse.move(cx, cy + 40);
await page.mouse.down();
for (let i = 0; i < 30; i++) {
  await page.mouse.move(cx + (i + 1) * 12, cy + 40 - (i + 1) * 10);
  await page.waitForTimeout(20);
}
await page.mouse.up();
await page.waitForTimeout(400);
const afterCenter = await page.locator('.readout div').first().innerText();
if (beforeCenter === afterCenter) throw new Error('North-pole drag did not move the centre readout');
await page.waitForTimeout(300);
const afterParams = new URL(page.url()).searchParams;
const dec = Number(afterParams.get('dec'));
if (!Number.isFinite(dec) || Math.abs(dec) > 90) throw new Error(`Dec out of bounds after pole drag: ${dec}`);
if (afterParams.get('proj') !== 'SIN') throw new Error('Projection changed during pole drag');
await page.screenshot({ path: resolve(out, 'north-pole-drag.png') });

console.log(JSON.stringify({ ok: true, fov, proj: 'SIN', disc: true, poleDrag: true }, null, 2));
await browser.close();
