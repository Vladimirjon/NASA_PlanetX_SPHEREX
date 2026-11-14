/**
 * Deep-link alias smoke: /series.html?name=… must land in the integrated app.
 */
import { chromium } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const addr = server.httpServer?.address();
if (!addr || typeof addr === 'string') throw new Error('no address');
const base = `http://127.0.0.1:${addr.port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${base}/series.html?name=epsilon-indi-b`, { waitUntil: 'domcontentloaded' });
await page.waitForURL(/target=epsilon-indi-b/, { timeout: 10000 });
await page.waitForSelector('[data-testid="visit-label"]', { timeout: 65000 });
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="visit-label"]');
  return el && /Visit \d+ of \d+/.test(el.textContent || '');
}, { timeout: 65000 });
console.log(JSON.stringify({ ok: true, url: page.url() }));
await browser.close();
await server.close();
