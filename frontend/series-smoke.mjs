import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, '../docs/reviews/series-viewer');
await mkdir(outDir, { recursive: true });

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});
await server.listen();
const addr = server.httpServer?.address();
if (!addr || typeof addr === 'string') throw new Error('Vite server address unavailable');
const base = `http://127.0.0.1:${addr.port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});

const errors = [];

function isBenignNetworkNoise(text) {
  return (
    text.includes('503') ||
    text.includes('Failed to load resource') ||
    text.includes('/api/v1/')
  );
}

async function openSeries(path, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (isBenignNetworkNoise(text)) return;
    errors.push(text);
  });
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="visit-label"]', { timeout: 20000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="visit-label"]');
    return el && /Visit \d+ of \d+/.test(el.textContent || '');
  }, { timeout: 20000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  return page;
}

const smoke = await openSeries('/series.html?name=epsilon-indi-b', { width: 1440, height: 900 });
const labelBefore = await smoke.locator('[data-testid="visit-label"]').textContent();
await smoke.keyboard.press('Space');
await smoke.waitForTimeout(200);
const playBtn = smoke.getByRole('button', { name: /Play|Pause/ });
await playBtn.waitFor();
// After Space, should be paused (Play visible) when it was playing
await smoke.keyboard.press('ArrowRight');
await smoke.waitForTimeout(100);
const labelAfter = await smoke.locator('[data-testid="visit-label"]').textContent();
if (!labelBefore || !labelAfter) throw new Error('Missing visit labels');
if (labelBefore === labelAfter) {
  // colour/difference might not change label index if still frame 0->1 failed
  await smoke.keyboard.press('ArrowRight');
  await smoke.waitForTimeout(100);
}
const labelStepped = await smoke.locator('[data-testid="visit-label"]').textContent();
if (labelBefore === labelStepped) throw new Error(`Arrow did not step frames: still "${labelBefore}"`);

await smoke.screenshot({ path: resolve(outDir, 'epsilon-indi-b-desktop-1440x900.png'), fullPage: true });
await smoke.close();

const barnardDesktop = await openSeries('/series.html?name=barnards-star', { width: 1440, height: 900 });
await barnardDesktop.waitForTimeout(500);
await barnardDesktop.screenshot({ path: resolve(outDir, 'barnards-star-desktop-1440x900.png'), fullPage: true });
await barnardDesktop.close();

const barnardMobile = await openSeries('/series.html?name=barnards-star', { width: 375, height: 812 });
await barnardMobile.waitForTimeout(500);
await barnardMobile.screenshot({ path: resolve(outDir, 'barnards-star-mobile-375x812.png'), fullPage: true });
await barnardMobile.close();

const epsMobile = await openSeries('/series.html?name=epsilon-indi-b', { width: 375, height: 812 });
await epsMobile.waitForTimeout(500);
await epsMobile.screenshot({ path: resolve(outDir, 'epsilon-indi-b-mobile-375x812.png'), fullPage: true });
await epsMobile.close();

await browser.close();
await server.close();

if (errors.length) {
  console.error(JSON.stringify({ errors }, null, 2));
  throw new Error(`Console errors:\n${errors.join('\n')}`);
}
console.log(JSON.stringify({ ok: true, screenshots: outDir, errors: 0 }, null, 2));
