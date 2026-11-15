import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const qaOut = resolve(root, '../../docs/landing/copernix-qa');
const BASE = 'http://127.0.0.1:4410/viewer/?target=wise-0855&lang=es';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

await mkdir(qaOut, { recursive: true });

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForSelector('[data-testid="sky-map"]', { timeout: 30_000 });

await page.waitForTimeout(150);
await page.screenshot({ path: resolve(qaOut, 'revision6-globe-markers-es.png') });

await page.waitForFunction(
  () => !document.querySelector('.skip-intro-fly'),
  null,
  { timeout: 40_000 },
);
await page.waitForSelector('[data-testid="cutout-card"]', { timeout: 90_000 }).catch(() => {});
await page.screenshot({ path: resolve(qaOut, 'revision6-arrival-es.png') });

const next = page.getByRole('button', { name: /Foto siguiente|Next photo/i }).first();
if (await next.isVisible()) await next.click();
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(qaOut, 'revision6-carousel-a-es.png') });
if (await next.isVisible()) await next.click();
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(qaOut, 'revision6-carousel-b-es.png') });

const tip = page.locator('.left-col .tip').first();
if (await tip.isVisible()) {
  await tip.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: resolve(qaOut, 'revision6-tip-column-es.png') });
}

await page.close();
await browser.close();
console.log('revision6 captures written to', qaOut);