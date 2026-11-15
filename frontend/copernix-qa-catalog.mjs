/**
 * Copernix QA (encargo 06): catalog search, intro guide, mode help line.
 * SwiftShader only. Prefer COPERNIX_URL=http://127.0.0.1:4410/viewer/
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, '../docs/landing/copernix-qa');
await mkdir(outDir, { recursive: true });

const base = process.env.COPERNIX_URL ?? 'http://127.0.0.1:4410/viewer/';
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

async function dismissIntro(page) {
  const guide = page.getByTestId('intro-guide');
  if (await guide.count()) {
    await page.getByRole('button', { name: /Saltar|Skip/i }).click();
    await page.waitForTimeout(300);
  }
}

const page = await newPage({ width: 1280, height: 800 });
await page.addInitScript(() => {
  try {
    localStorage.removeItem('copernix_intro');
  } catch {
    /* ignore */
  }
});
await page.goto(`${base}?target=wise-0855&lang=es`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('[data-testid="sky-map"]', { timeout: 30000 });
await page.waitForTimeout(2000);

await page.getByTestId('intro-guide').waitFor({ state: 'visible', timeout: 10000 });
await page.screenshot({ path: resolve(outDir, 'revision4-guia.png') });
await dismissIntro(page);

// Reopen guide
await page.getByTestId('reopen-intro').click();
await page.getByTestId('intro-guide').waitFor({ state: 'visible', timeout: 5000 });
await dismissIntro(page);

// Mode help changes
const help = page.getByTestId('mode-help');
const helpLoop = (await help.textContent()) || '';
await page.getByRole('button', { name: /Solo lo que cambió|Only what changed/i }).click();
await page.waitForTimeout(200);
const helpDiff = (await help.textContent()) || '';
if (helpDiff === helpLoop) throw new Error('mode help did not change after switching mode');
await page.getByRole('button', { name: /Fechas en color|Dates in colour/i }).click();
await page.waitForTimeout(200);
const helpColour = (await help.textContent()) || '';
if (helpColour === helpDiff) throw new Error('mode help did not change for colour mode');

// Catalog search: Proxima
const input = page.getByTestId('catalog-search');
await input.fill('Proxima');
await page.waitForSelector('.search-hit', { timeout: 15000 });
await page.locator('.search-hit').first().click();
await page.waitForTimeout(2500);
await page.waitForFunction(() => {
  const title = document.querySelector('.hero-title');
  return title && /Proxima/i.test(title.textContent || '');
}, { timeout: 20000 });
const url1 = page.url();
if (!/[?&]name=/.test(url1) && !/Proxima/i.test(url1)) {
  // name may be encoded
  if (!decodeURIComponent(url1).toLowerCase().includes('proxima')) {
    throw new Error(`expected ?name= for Proxima, got ${url1}`);
  }
}
await page.getByTestId('target-marker').waitFor({ state: 'visible', timeout: 15000 });
await page.screenshot({ path: resolve(outDir, 'revision4-busqueda.png') });

// Sirius
await input.fill('Sirius');
await page.waitForSelector('.search-hit', { timeout: 15000 });
await page.locator('.search-hit').first().click();
await page.waitForTimeout(2500);
await page.waitForFunction(() => {
  const title = document.querySelector('.hero-title');
  return title && /Sirius/i.test(title.textContent || '');
}, { timeout: 20000 });
await page.getByTestId('target-marker').waitFor({ state: 'visible', timeout: 15000 });

await page.screenshot({ path: resolve(outDir, 'revision4-es-desktop.png') });

// EN desktop
await page.goto(`${base}?target=wise-0855&lang=en`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
await dismissIntro(page);
await page.screenshot({ path: resolve(outDir, 'revision4-en-desktop.png') });

// Mobile ES
const mobile = await newPage({ width: 390, height: 844 });
await mobile.addInitScript(() => {
  try {
    localStorage.setItem('copernix_intro', '1');
  } catch {
    /* ignore */
  }
});
await mobile.goto(`${base}?target=wise-0855&lang=es`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await mobile.waitForTimeout(2500);
await mobile.screenshot({ path: resolve(outDir, 'revision4-es-mobile.png') });
await mobile.close();

await browser.close();

if (errors.length) {
  console.error('Page errors:', errors.slice(0, 8));
  process.exitCode = 1;
} else {
  console.log('copernix-qa-catalog OK → docs/landing/copernix-qa/revision4-*');
}
