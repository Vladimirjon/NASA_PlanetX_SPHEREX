import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, '../docs/reviews/app');
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
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

const errors = [];
function isBenign(text) {
  return text.includes('Failed to load resource') || text.includes('/api/v1/') || text.includes('503');
}

async function page(viewport) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !isBenign(m.text())) errors.push(m.text());
  });
  return p;
}

// Landing
const landing = await page({ width: 1440, height: 900 });
await landing.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await landing.waitForSelector('[data-testid="sky-map"]', { timeout: 20000 });
await landing.waitForTimeout(1500);
await landing.screenshot({ path: resolve(outDir, 'landing-desktop-1440x900.png'), fullPage: true });

// Barnard's Star card → fly → time panel
await landing.getByRole('button', { name: /Barnard's Star/i }).click();
await landing.waitForSelector('[data-testid="visit-label"]', { timeout: 65000 });
await landing.waitForFunction(() => {
  const el = document.querySelector('[data-testid="visit-label"]');
  return el && /Visit \d+ of \d+/.test(el.textContent || '');
}, { timeout: 65000 });
// Timeline should show visit markers
await landing.waitForSelector('.tl-mark.solid', { timeout: 10000 });
const marks = await landing.locator('.tl-mark.solid').count();
if (marks < 2) throw new Error(`Expected ≥2 visit markers, got ${marks}`);

const before = await landing.locator('[data-testid="visit-label"]').textContent();
await landing.keyboard.press('Space');
await landing.waitForTimeout(200);
await landing.locator('.tl-mark.solid').nth(1).click();
await landing.waitForTimeout(300);
const after = await landing.locator('[data-testid="visit-label"]').textContent();
if (!before || !after || before === after) throw new Error(`Expected frame change after 2nd marker: "${before}" → "${after}"`);
await landing.screenshot({ path: resolve(outDir, 'barnard-time-panel-desktop-1440x900.png'), fullPage: true });
await landing.close();

// Eps Indi B difference mode
const eps = await page({ width: 1440, height: 900 });
await eps.goto(`${base}/?target=epsilon-indi-b`, { waitUntil: 'domcontentloaded' });
await eps.waitForFunction(() => {
  const el = document.querySelector('[data-testid="visit-label"]');
  return el && /Visit \d+ of \d+/.test(el.textContent || '');
}, { timeout: 65000 });
await eps.getByRole('button', { name: 'Difference', exact: true }).click();
await eps.waitForTimeout(500);
await eps.screenshot({ path: resolve(outDir, 'eps-indi-difference-desktop-1440x900.png'), fullPage: true });
await eps.close();

// Arbitrary region loading state (Andromeda) — capture while loading or result
const and = await page({ width: 1440, height: 900 });
await and.goto(`${base}/?ra=10.6847&dec=41.2690&fov=0.5`, { waitUntil: 'domcontentloaded' });
// Try to catch loading UI quickly
await and.waitForTimeout(200);
const loadingVisible = await and.locator('[data-testid="loading-progress"]').count();
if (loadingVisible > 0) {
  await and.screenshot({ path: resolve(outDir, 'arbitrary-loading-desktop-1440x900.png'), fullPage: true });
}
await and.waitForTimeout(3000);
// Final state (ready or error)
await and.screenshot({ path: resolve(outDir, 'arbitrary-region-desktop-1440x900.png'), fullPage: true });
await and.close();

// Mobile landing + Barnard
const mobile = await page({ width: 375, height: 812 });
await mobile.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: resolve(outDir, 'landing-mobile-375x812.png'), fullPage: true });
await mobile.getByRole('button', { name: /Barnard's Star/i }).click();
await mobile.waitForFunction(() => {
  const el = document.querySelector('[data-testid="visit-label"]');
  return el && /Visit \d+ of \d+/.test(el.textContent || '');
}, { timeout: 65000 });
await mobile.screenshot({ path: resolve(outDir, 'barnard-time-panel-mobile-375x812.png'), fullPage: true });
await mobile.close();

await browser.close();
await server.close();

if (errors.length) {
  console.error(JSON.stringify({ errors }, null, 2));
  throw new Error(errors.join('\n'));
}
console.log(JSON.stringify({ ok: true, screenshots: outDir, errors: 0 }, null, 2));
