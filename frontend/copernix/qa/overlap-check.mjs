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
  { w: 1024, h: 768 },
  { w: 686, h: 800, shot: '686x800' },
  { w: 768, h: 1024 },
  { w: 820, h: 1180 },
  { w: 390, h: 844, shot: '390x844' },
  { w: 360, h: 640, shot: '360x640' },
];

/** Top-level UI regions only (no nested column blocks). */
const BLOCKS = [
  { id: 'left-col', selector: '.left-col', desktopOnly: true },
  { id: 'dock', selector: '.dock' },
  { id: 'cutout', selector: '[data-testid="cutout-card"]', needSeries: true },
  { id: 'zoom', selector: '.map-controls' },
  { id: 'intro', selector: '.intro-card', optional: true },
  { id: 'lang', selector: '.lang' },
  { id: 'tip', selector: '.tipbox.on', optional: true },
  { id: 'return', selector: '.return-pill', optional: true },
];

const PAIR_IDS = [
  ['left-col', 'dock'],
  ['left-col', 'cutout'],
  ['left-col', 'zoom'],
  ['left-col', 'intro'],
  ['left-col', 'lang'],
  ['left-col', 'tip'],
  ['left-col', 'return'],
  ['dock', 'cutout'],
  ['dock', 'zoom'],
  ['dock', 'intro'],
  ['dock', 'lang'],
  ['dock', 'tip'],
  ['dock', 'return'],
  ['cutout', 'zoom'],
  ['cutout', 'intro'],
  ['cutout', 'tip'],
  ['cutout', 'return'],
  ['zoom', 'intro'],
  ['zoom', 'return'],
  ['lang', 'return'],
  ['intro', 'return'],
  ['tip', 'return'],
  ['zoom', 'lang'],
  ['zoom', 'tip'],
  ['intro', 'lang'],
  ['intro', 'tip'],
  ['lang', 'tip'],
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
    if (!(await el.isVisible())) continue;   // a hidden element cannot overlap anything
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
  await page.waitForFunction(
    () => !document.querySelector('.skip-intro-fly'),
    null,
    { timeout: 45_000 },
  ).catch(() => {});
  if (!isMobile) {
    await page.waitForSelector('[data-testid="cutout-card"]', { timeout: 90_000 }).catch(() => {});
  }
  await page.waitForTimeout(600);
}

async function assertCandidateCross(page) {
  await page.waitForTimeout(2200);
  const canvas = page.getByTestId('sky-map');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no sky canvas box');
  const clicks = [
    { x: box.x + box.width * 0.62, y: box.y + box.height * 0.38 },
    { x: box.x + box.width * 0.72, y: box.y + box.height * 0.55 },
    { x: box.x + box.width * 0.55, y: box.y + box.height * 0.62 },
  ];
  const last = clicks[clicks.length - 1];
  for (const c of clicks) {
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(300);
  }
  const x = last?.x ?? box.x + box.width / 2;
  const y = last?.y ?? box.y + box.height / 2;
  await page.waitForFunction(() => {
    const cross = document.querySelector('.candidate-cross');
    if (!cross) return false;
    const r = cross.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }, null, { timeout: 12_000 });
  const cross = await page.locator('.candidate-cross').boundingBox();
  if (!cross) throw new Error('candidate cross missing');
  const cx = cross.x + cross.width / 2;
  const cy = cross.y + cross.height / 2;
  const dx = Math.abs(cx - x);
  const dy = Math.abs(cy - y);
  if (dx > 1 || dy > 1) {
    throw new Error(`candidate cross off by ${dx.toFixed(2)}px, ${dy.toFixed(2)}px`);
  }
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
        await page.addInitScript(() => localStorage.removeItem('copernix_tour_off'));
      },
    },
    {
      key: 'no-intro',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
      },
    },
    {
      key: 'light-open',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
      },
      after: async page => {
        const opts = page.locator('.options-toggle');
        if (await opts.isVisible()) await opts.click();
        const btn = page.getByRole('button', { name: /Tipo de luz|Type of light/i });
        if (await btn.isVisible()) await btn.click();
      },
    },
    {
      key: 'options-open',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
      },
      after: async page => {
        const opts = page.locator('.options-toggle');
        if (await opts.isVisible()) await opts.click();
        await page.waitForTimeout(150);
      },
    },
    {
      key: 'return-pill',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
      },
      after: async page => {
        const box = await page.getByTestId('sky-map').boundingBox();
        if (!box) return;
        for (let i = 0; i < 6; i++) {   // far enough that "Return to …" is offered
          await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.7, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(250);
        }
        await page.waitForTimeout(600);
      },
    },
    ...[2, 3, 4, 5].map(n => ({
      key: `intro-step-${String(n)}`,
      setup: async page => {
        await page.addInitScript(() => localStorage.removeItem('copernix_tour_off'));
      },
      after: async page => {
        for (let i = 1; i < n; i++) {
          await page.locator('.intro-card .go').click();
          await page.waitForTimeout(450);
        }
      },
    })),
    {
      key: 'tip-open',
      setup: async page => {
        await page.addInitScript(() => localStorage.setItem('copernix_tour_off', '1'));
      },
      after: async page => {
        const tip = page.locator('.tip').first();
        if (await tip.isVisible()) await tip.click();
        await page.waitForTimeout(200);
      },
    },
  ];

  for (const sc of scenarios) {
    if (sc.key === 'tip-open' && isMobile) continue;

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
        path: resolve(qaOut, `revision6-${vp.shot}-es.png`),
        fullPage: false,
      });
    }
    if (vp.shot === '686x800' && sc.key === 'options-open') {
      await page.screenshot({
        path: resolve(qaOut, 'revision6-686-options-es.png'),
        fullPage: false,
      });
    }
    await page.close();
  }
}

try {
  const crossPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await crossPage.addInitScript(() => {
    localStorage.setItem('copernix_tour_off', '1');
  });
  await crossPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await preparePage(crossPage, false);
  await assertCandidateCross(crossPage);
  rows.push({
    viewport: '1280x720',
    scenario: 'candidate-cross',
    overlaps: '—',
    overflow: 'no',
    ok: 'OK',
  });
  await crossPage.close();
} catch (err) {
  failed = true;
  rows.push({
    viewport: '1280x720',
    scenario: 'candidate-cross',
    overlaps: err instanceof Error ? err.message : String(err),
    overflow: '—',
    ok: 'FAIL',
  });
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