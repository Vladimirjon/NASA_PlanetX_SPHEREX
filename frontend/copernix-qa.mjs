/**
 * Copernix viewer QA (encargo 05): marker must not move on map clicks;
 * candidate appears; Analyze → custom; Return works. SwiftShader only.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, '../docs/landing/copernix-qa');
await mkdir(outDir, { recursive: true });

const base = process.env.COPERNIX_URL ?? 'http://127.0.0.1:5173/viewer/';
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});

const errors = [];
function isBenign(text) {
  return (
    text.includes('Failed to load resource') ||
    text.includes('/api/v1/') ||
    text.includes('WebGL') ||
    text.includes('503') ||
    text.includes('404')
  );
}

async function newPage(viewport) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !isBenign(m.text())) errors.push(m.text());
  });
  return p;
}

async function markerBox(page) {
  const el = page.getByTestId('target-marker');
  await el.waitFor({ state: 'visible', timeout: 30000 });
  return el.boundingBox();
}

function nearlySame(a, b, tol = 2) {
  return a && b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
}

const page = await newPage({ width: 1280, height: 800 });
await page.goto(`${base}?target=rw-aurigae&lang=es`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="sky-map"]', { timeout: 20000 });
await page.waitForTimeout(2500);

const before = await markerBox(page);
if (!before) throw new Error('target marker missing before clicks');

const canvas = page.getByTestId('sky-map');
const box = await canvas.boundingBox();
if (!box) throw new Error('sky canvas missing');

const clicks = [
  { x: box.x + box.width * 0.62, y: box.y + box.height * 0.38 },
  { x: box.x + box.width * 0.72, y: box.y + box.height * 0.55 },
  { x: box.x + box.width * 0.55, y: box.y + box.height * 0.62 },
];

for (const c of clicks) {
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(350);
}

const afterClicks = await markerBox(page);
if (!nearlySame(before, afterClicks)) {
  throw new Error(
    `target marker moved on map click: before=${JSON.stringify(before)} after=${JSON.stringify(afterClicks)}`,
  );
}

await page.getByTestId('candidate-marker').waitFor({ state: 'visible', timeout: 5000 });
await page.screenshot({ path: resolve(outDir, 'revision3-candidato.png') });

await page.getByTestId('analyze-candidate').click();
await page.waitForTimeout(1500);
await page.waitForFunction(() => {
  const title = document.querySelector('.hero-title');
  return title && /Punto RA|Point RA/.test(title.textContent || '');
}, { timeout: 15000 });

const customTitle = await page.locator('.hero-title').textContent();
if (!customTitle || !/Punto RA/.test(customTitle)) {
  throw new Error(`expected custom point title, got "${customTitle ?? ''}"`);
}

const returnBtn = page.getByTestId('return-to-target').or(page.getByTestId('return-to-target-inline'));
await returnBtn.first().click({ timeout: 10000 });
await page.waitForTimeout(2000);
await page.waitForFunction(() => {
  const title = document.querySelector('.hero-title');
  return title && /RW Aurigae/.test(title.textContent || '');
}, { timeout: 20000 });

await page.screenshot({ path: resolve(outDir, 'revision3-es-desktop.png') });
await page.close();

const en = await newPage({ width: 1280, height: 800 });
await en.goto(`${base}?target=wise-0855&lang=en`, { waitUntil: 'domcontentloaded' });
await en.waitForSelector('[data-testid="sky-map"]', { timeout: 20000 });
await en.waitForTimeout(2500);
await en.screenshot({ path: resolve(outDir, 'revision3-en-desktop.png') });
await en.close();

const mobile = await newPage({ width: 390, height: 844 });
await mobile.goto(`${base}?target=rw-aurigae&lang=es`, { waitUntil: 'domcontentloaded' });
await mobile.waitForSelector('[data-testid="sky-map"]', { timeout: 20000 });
await mobile.waitForTimeout(2500);
await mobile.screenshot({ path: resolve(outDir, 'revision3-es-mobile.png') });
await mobile.close();

await browser.close();

if (errors.length) {
  console.warn('Non-fatal console errors:', errors.slice(0, 8));
}

console.log('OK copernix-qa');
console.log('marker_before', JSON.stringify(before));
console.log('marker_after_clicks', JSON.stringify(afterClicks));
console.log('screenshots', outDir);
