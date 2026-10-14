import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const folder = 'art/previews/loading';
await mkdir(folder, { recursive: true });
await mkdir('tmp/loading', { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const base = 'http://127.0.0.1:4173';
const times = [];
for (let i = 0; i < 5; i++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(base); await page.locator('#loading').waitFor({ state: 'hidden' });
  times.push(await page.evaluate(() => ({ milliseconds: performance.getEntriesByName('hop-brawl-interactive')[0].startTime,
    firstPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    bytes: document.querySelector('#loading').dataset.bytes, total: document.querySelector('#loading').dataset.total })));
  await context.close();
}
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
let release;
const gate = new Promise(resolve => { release = resolve; });
await page.route('**/models/fox.glb', async route => { await gate; await route.continue(); });
await page.addInitScript(() => {
  window.reviewAnimations = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function(...args) {
    const animation = animate.apply(this, args);
    if (this.closest('#loading')) { animation.pause(); window.reviewAnimations.push(animation); }
    return animation;
  };
});
await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
const frames = [];
async function shot(label) {
  const file = `tmp/loading/frame-${frames.length}.png`; await page.screenshot({ path: file });
  frames.push({ file, label });
}
await shot('1 · Actual byte progress'); release();
await page.waitForFunction(() => document.querySelector('#loading').dataset.state === 'punch');
await page.evaluate(() => { window.reviewAnimations[0].currentTime = 100; }); await shot('2 · Punch · 100 ms');
await page.evaluate(() => window.reviewAnimations[0].finish());
await page.waitForFunction(() => window.reviewAnimations.length === 3);
await shot('3 · Diagonal split · 0 ms');
await page.evaluate(() => { for (const a of window.reviewAnimations.slice(1)) a.currentTime = 180; }); await shot('4 · Reveal · 180 ms');
await page.evaluate(() => { for (const a of window.reviewAnimations.slice(1)) a.currentTime = 240; }); await shot('5 · Reveal · 240 ms');
await page.evaluate(() => { for (const a of window.reviewAnimations.slice(1)) a.finish(); });
await page.locator('#loading').waitFor({ state: 'hidden' }); await page.waitForTimeout(1800); await shot('6 · Home / logo landed');
await context.close();
const error = await browser.newPage({ viewport: { width: 390, height: 844 } });
await error.route('**/models/fox.glb', route => route.fulfill({ status: 503, body: 'Review: unavailable asset' }));
await error.goto(base); await error.locator('#load-error').waitFor();
await error.screenshot({ path: `${folder}/error.png` }); await error.close();
const sheet = await browser.newPage({ viewport: { width: 1560, height: 610 } });
const cards = [];
for (const frame of frames) cards.push(`<figure><img src="data:image/png;base64,${(await readFile(frame.file)).toString('base64')}"><figcaption>${frame.label}</figcaption></figure>`);
await sheet.setContent(`<style>body{margin:0;background:#1B1B2F;color:#FFF6E5;display:flex;font:14px system-ui}figure{margin:0;width:260px}img{width:260px;display:block}figcaption{padding:14px 8px}</style>${cards.join('')}`);
await sheet.screenshot({ path: `${folder}/transition.png` });
await browser.close();
const evidence = { production: true, viewport: '1440x900', coldCache: true, runs: times,
  htmlBytes: (await readFile('client/dist/index.html')).byteLength,
  maxMs: Math.max(...times.map(row => row.milliseconds)), medianMs: times.map(row => row.milliseconds).sort((a, b) => a - b)[2] };
await writeFile('art/review/loading-measurements.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
