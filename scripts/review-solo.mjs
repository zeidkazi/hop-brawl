import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const folder = 'art/previews/solo'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const measurements = [];
for (const [name, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Hopper', animal: 2, haptics: false, sfx: 0 }));
    localStorage.setItem('hop-brawl-solo-best', '8');
  });
  await page.goto('http://127.0.0.1:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.evaluate(() => {
    document.querySelectorAll('.debug-metrics,.lil-gui,body>div:not([id])').forEach(node => { node.hidden = true; });
  });
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'countdown');
  await page.waitForTimeout(750);
  await page.screenshot({ path: `${folder}/${name}-countdown.png` });
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(180); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/${name}-playing.png` });
  for (let i = 0; i < 20; i++) { await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(200); }
  const performance = await page.evaluate(() => window.__HOP_DEBUG__.snapshot());
  await page.keyboard.press('Escape'); await page.locator('#pause').waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#pause')).opacity === '1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${folder}/${name}-pause.png` });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'over', undefined, { timeout: 30000 });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#soloEnd')).opacity === '1');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${folder}/${name}-over.png` });
  await page.evaluate(() => document.querySelector('#soloEnd [data-solo="restart"]').addEventListener('click', () => { window.retryReviewStart = window.performance.now(); }, { once: true }));
  await page.getByRole('button', { name: 'RETRY', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'countdown');
  const retryResetMs = await page.evaluate(() => window.performance.now() - window.retryReviewStart);
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
  const retryPlayableMs = await page.evaluate(() => window.performance.now() - window.retryReviewStart);
  measurements.push({ name, viewport, performance, retryResetMs, retryPlayableMs, errors });
  await context.close();
}
await writeFile('art/review/solo-measurements.json', JSON.stringify(measurements, null, 2) + '\n');
console.log(JSON.stringify(measurements, null, 2));
const cold = [];
for (let i = 0; i < 5; i++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('http://127.0.0.1:4173/'); await page.locator('#loading').waitFor({ state: 'hidden' });
  cold.push(await page.evaluate(() => ({ milliseconds: performance.getEntriesByName('hop-brawl-interactive')[0].startTime,
    firstPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    bytes: document.querySelector('#loading').dataset.bytes, total: document.querySelector('#loading').dataset.total })));
  await context.close();
}
await browser.close();
const loading = { production: true, coldCache: true, runs: cold, htmlBytes: (await readFile('client/dist/index.html')).byteLength,
  maxMs: Math.max(...cold.map(row => row.milliseconds)), medianMs: cold.map(row => row.milliseconds).sort((a, b) => a - b)[2] };
await writeFile('art/review/solo-loading-measurements.json', JSON.stringify(loading, null, 2) + '\n');
console.log(JSON.stringify(loading, null, 2));
