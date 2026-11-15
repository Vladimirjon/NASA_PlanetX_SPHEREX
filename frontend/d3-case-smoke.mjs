import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const address = server.httpServer?.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}`;
const shots = process.env.SKYSHIFT_D3_SCREENSHOTS;
let browser;

async function openDemo(viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  await page.route('**/api/v1/**', route => route.fulfill({
    status: 503,
    json: { status: 503, type: 'about:blank', title: 'Offline demo test' },
  }));
  return page;
}

async function screenshot(page, name) {
  if (!shots) return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: resolve(shots, name) });
}

try {
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const desktop = await openDemo({ width: 1440, height: 900 });
  const errors = [];
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(`${base}/?target=epsilon-indi-b`);
  await expect(desktop.getByTestId('visit-label')).toContainText(/of 4/);
  const explore = desktop.getByRole('button', { name: 'Explore D3 comparison' });
  await explore.focus();
  await desktop.keyboard.press('Space');
  await expect(desktop.getByText(/6\.05\s*(?:arcseconds|″)/i).first()).toBeVisible();
  await expect(desktop.getByTestId('visit-label')).toContainText(/of 2/);
  const first = await desktop.getByTestId('visit-label').textContent();
  const canvas = desktop.getByRole('img', { name: /SPHEREx detector D3/ });
  const firstPixels = await canvas.evaluate(element => element.toDataURL());
  await desktop.getByRole('button', { name: 'Next frame' }).click();
  await expect(desktop.getByTestId('visit-label')).not.toHaveText(first ?? '');
  await expect.poll(() => canvas.evaluate(element => element.toDataURL())).not.toBe(firstPixels);
  await desktop.getByRole('button', { name: 'Light', exact: true }).click();
  await screenshot(desktop, 'd3-desktop.png');
  const details = desktop.getByText('Inspect pair evidence', { exact: true });
  await details.click();
  const imageA = desktop.getByRole('link', { name: /Image A.*2025-06-10/ });
  const imageB = desktop.getByRole('link', { name: /Image B.*2026-09-28/ });
  await expect(imageA).toHaveAttribute('href', /2025W24_1A_0245_4D3/);
  await expect(imageB).toHaveAttribute('href', /2026W40_1A_0070_2D3/);
  await expect(desktop.getByText(/model-based uncertainty/i)).toBeVisible();
  await details.click();
  await desktop.getByRole('button', { name: 'Projector', exact: true }).click();
  await screenshot(desktop, 'd3-projector.png');
  await desktop.getByRole('button', { name: 'Back to time series' }).click();
  await expect(desktop.getByTestId('visit-label')).toContainText(/of 4/);
  await expect(desktop.getByText(/6\.05\s*(?:arcseconds|″)/i)).toHaveCount(0);
  await desktop.getByRole('button', { name: 'Explore D3 comparison' }).click();
  await expect(desktop.getByText(/6\.05\s*(?:arcseconds|″)/i).first()).toBeVisible();
  await desktop.getByRole('button', { name: /Barnard's Star/i }).click();
  await expect(desktop.getByText(/6\.05\s*(?:arcseconds|″)/i)).toHaveCount(0);
  await expect(desktop.getByRole('button', { name: 'Explore D3 comparison' })).toHaveCount(0);
  assert.deepEqual(errors, []);
  await desktop.close();

  const mobile = await openDemo({ width: 390, height: 844 });
  await mobile.goto(`${base}/?target=epsilon-indi-b&case=d3`);
  const mobileResult = mobile.getByText(/6\.05\s*(?:arcseconds|″)/i).first();
  await expect(mobileResult).toBeVisible();
  await screenshot(mobile, 'd3-mobile.png');
  await mobileResult.scrollIntoViewIfNeeded();
  await expect(mobileResult).toBeInViewport();
  await screenshot(mobile, 'd3-mobile-evidence.png');
  await mobile.close();

  const unavailable = await openDemo({ width: 1000, height: 800 });
  await unavailable.route('**/demo/epsilon-indi-b-d3/**', route => route.fulfill({ status: 404 }));
  await unavailable.goto(`${base}/?target=epsilon-indi-b&case=d3`);
  await expect(unavailable.getByRole('alert')).toContainText('The D3 comparison could not be loaded.');
  await unavailable.getByRole('button', { name: 'Back to time series' }).click();
  await expect(unavailable.getByTestId('visit-label')).toContainText(/of 4/);
  await unavailable.close();
  console.log('D3 case smoke passed: keyboard, two observations, evidence, return, mobile, missing assets');
} finally {
  await browser?.close();
  await server.close();
}
