import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const qaOut = resolve(root, '../../docs/landing/copernix-qa');

const BASE_URL = 'http://127.0.0.1:4410/viewer/?target=wise-0855&lang=es';
const TOL = 2;

const VIEWPORTS = [
  { w: 1366, h: 680, shot: '1366x680' },
  { w: 1280, h: 720, shot: '1280x720' },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080, shot: '1920x1080' },
  { w: 390, h: 844, shot: '390x844' },
  { w: 360, h: 640 },
];

/** Top-level UI regions only (no nested column blocks). */
const BLOCKS = [
  { id: 'left-col', selector: '.left-col', desktopOnly: true },
  { id: 'dock', selector: '.dock' },
  { id: 'cutout', selector: '[data-testid="cutout-card"]', needSeries: true },
  { id: 'zoom', selector: '.map-controls' },
  { id: 'intro', selector: '.intro-card', optional: true },
  { id: 'lang', selector: '.lang' },
];

const PAIR_IDS = [
  ['left-col', 'dock'],
  ['left-col', 'cutout'],
  ['left-col', 'zoom'],
  ['left-col', 'intro'],
  ['left-col', 'lang'],
  ['dock', 'cutout'],
  ['dock', 'zoom'],
  ['dock', 'intro'],
  ['dock', 'lang'],
  ['cutout', 'zoom'],
  ['cutout', 'intro'],
  ['cutout', 'lang'],
  ['zoom', 'intro'],
  ['zoom', 'lang'],
  ['intro', 'lang'],
];

function edges(box) {
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
  };
}

function intersects(a, b) {
  const A = edges(a);
  const B = edges(b);
  return !(
    A.right - TOL <= B.left ||
    A.left + TOL >= B.right ||
    A.bottom - TOL <= B.top ||
    A.top + TOL >= B.bottom
  );
}

function contains(outer, inner) {
  const O = edges(outer);
  const I = edges(inner);
  return (
    O.left <= I.left + TOL &&
    O.right >= I.right - TOL &&
    O.top <= I.top + TOL &&
    O.bottom >= I.bottom - TOL
  );
}

async function collectRects(page, isMobile) {
  const map = new Map();
  for (const block of BLOCKS) {
    if (block.desktopOnly && isMobile) continue;
    const el = await page.$(block.selector);
    if (!el) {
      if (block.optional || block.needSeries) continue;
      throw new Error(`missing ${block.id}`);
    }
    const visible = await el.isVisible();
    if (!visible) {
      if (block.optional) continue;
      if (block.needSeries) continue;
    }
    const box = await el.boundingBox();
    if (box) map.set(block.id, box);
  }
  return map;
}

function findOverlaps(rects) {
  const pairs = [];
  for (const [aId, bId] of PAIR_IDS) {
    const a = rects.get(aId);
    const b = rects.get(bId);
    if (!a || !b) continue;
    if (contains(a, b) || contains(b, a)) continue;
    if (intersects(a, b)) pairs.push(`${aId}×${bId}`);
  }
  return pairs;
}

async function preparePage(page, isMobile) {
  await page.waitForSelector('[data-testid="sky-map"]', { timeout: 30_000 });
  if (!isMobile) {
    await page.waitForSelector('[data-testid="cutout-card"]', { timeout: 90_000 }).catch(() => {});
  }
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

await mkdir(qaOut, { recursive: true });

const rows = [];
let failed = false;

for (const vp of VIEWPORTS) {
  const viewportLabel = `${vp.w}x${vp.h}`;
  const isMobile = vp.w <= 820;
  const scenarios = [
    {
      key: 'intro',
      setup: async page => {
        await page.addInitScript(() => localStorage.removeItem('copernix_intro'));
      },
    },
    {
      key: 'no-intro',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_intro', '1'));
      },
    },
    {
      key: 'light-open',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_intro', '1'));
      },
      after: async page => {
        const btn = page.getByRole('button', { name: /Tipo de luz|Type of light/i });
        if (await btn.isVisible()) await btn.click();
      },
    },
  ];

  for (const sc of scenarios) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await sc.setup(page);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.dock', { timeout: 45_000 });
    await preparePage(page, isMobile);
    if (sc.after) await sc.after(page);
    const docW = await page.evaluate(() => document.documentElement.scrollWidth);
    const overflow = docW > vp.w + TOL;
    const rects = await collectRects(page, isMobile);
    const overlaps = findOverlaps(rects);
    const ok = overlaps.length === 0 && !overflow;
    rows.push({
      viewport: viewportLabel,
      scenario: sc.key,
      overlaps: overlaps.length ? overlaps.join(', ') : '—',
      overflow: overflow ? 'SÍ' : 'no',
      ok: ok ? 'OK' : 'FAIL',
    });
    if (!ok) failed = true;

    if (vp.shot && sc.key === 'intro') {
      await page.screenshot({
        path: resolve(qaOut, `revision5-${vp.shot}-es.png`),
        fullPage: false,
      });
    }
    await page.close();
  }
}

await browser.close();

console.log('\n| Viewport | Escenario | Solapes | Desborde H | Estado |');
console.log('| --- | --- | --- | --- | --- |');
for (const r of rows) {
  console.log(`| ${r.viewport} | ${r.scenario} | ${r.overlaps} | ${r.overflow} | ${r.ok} |`);
}

if (failed) {
  console.error('\noverlap-check: FAILED');
  process.exit(1);
}
console.log('\noverlap-check: all viewports OK');
process.exit(0);