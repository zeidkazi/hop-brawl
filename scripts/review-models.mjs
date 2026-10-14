import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ANIMALS, BOXER } from '../shared/config.ts';

const folder = 'art/previews/signoff';
await mkdir(folder, { recursive: true });
await mkdir('tmp/signoff', { recursive: true });
const base = process.env.REVIEW_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const timings = [];
for (let i = 0; i < 5; i++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (!window.__reviewTTI && document.querySelector('#loading')?.hidden && document.querySelector('#home')) {
        requestAnimationFrame(() => { window.__reviewTTI ??= performance.now(); });
      }
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  await page.goto(base); await page.waitForFunction(() => window.__reviewTTI > 0, { timeout: 60000 });
  timings.push(await page.evaluate(() => ({ milliseconds: window.__reviewTTI,
    lastModelMs: Math.max(...performance.getEntriesByType('resource').filter(e => e.name.endsWith('.glb')).map(e => e.responseEnd)),
    modelRequests: performance.getEntriesByType('resource').filter(e => e.name.endsWith('.glb')).length })));
  await context.close();
}
console.log('COLD_PRODUCTION', timings);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
await page.waitForTimeout(5000);
await page.evaluate(() => { document.querySelector('.lil-gui')?.remove(); document.querySelector('.debug-metrics')?.remove(); for (const e of document.querySelectorAll('body > div')) if (e.style.position === 'fixed' && e.style.top === '0px') e.style.display = 'none'; document.activeElement?.blur(); });
await page.screenshot({ path: `${folder}/home-desktop.png` });
const desktopMetrics = await page.evaluate(() => window.__HOP_DEBUG__.snapshot());
await page.screenshot({ path: 'tmp/signoff/crowd-idle.png', clip: { x: 0, y: 190, width: 380, height: 420 } });
await page.evaluate(() => window.__HOP_DEBUG__.cheer()); await page.waitForTimeout(250);
await page.screenshot({ path: 'tmp/signoff/crowd-cheer.png', clip: { x: 0, y: 190, width: 380, height: 420 } });
const crops = [];
for (let index = 0; index < ANIMALS.length; index++) {
  await page.evaluate(index => { window.__HOP_DEBUG__.reviewAnimal(index); }, index);
  await page.waitForTimeout(100);
  const bounds = await page.locator('.animal-hit').boundingBox();
  const clip = { x: Math.round(bounds.x + bounds.width / 2 - 160), y: Math.round(bounds.y + bounds.height / 2 - 110), width: 320, height: 220 };
  await page.locator('#animal-label').evaluate(el => { el.style.visibility = 'hidden'; });
  const path = `tmp/signoff/grass-${ANIMALS[index]}.png`; await page.screenshot({ path, clip }); crops.push(path);
}
await page.evaluate(() => window.__HOP_DEBUG__.reviewAnimal(2));
const frames = {};
for (const [move, times] of [['tap', [0, .10, .16, .26, .33, BOXER.TAP_S]], ['combo', [0, .05, .10, .18, .26, BOXER.COMBO_S]], ['victory', [0, .08, .20, .45, .80, 1.2]]]) {
  frames[move] = [];
  for (const [index, time] of times.entries()) {
    await page.evaluate(({ move, time }) => window.__HOP_DEBUG__.reviewPose(move, time), { move, time }); await page.waitForTimeout(50);
    const bounds = await page.locator('.animal-hit').boundingBox();
    const path = `tmp/signoff/${move}-${index}.png`;
    await page.screenshot({ path, clip: { x: Math.round(bounds.x + bounds.width / 2 - 160), y: Math.round(bounds.y + bounds.height / 2 - 150), width: 320, height: 270 } });
    frames[move].push([path, `${Math.round(time * 1000)} ms`]);
  }
}
const otherMoves = [];
for (const [move, time] of [['guard', 0], ['hop', .035], ['hop', .105], ['punch', .12], ['stunned', .15], ['shake', .05]]) {
  await page.evaluate(({ move, time }) => window.__HOP_DEBUG__.reviewPose(move, time), { move, time }); await page.waitForTimeout(50);
  const bounds = await page.locator('.animal-hit').boundingBox(), path = `tmp/signoff/event-${otherMoves.length}.png`;
  await page.screenshot({ path, clip: { x: Math.round(bounds.x + bounds.width / 2 - 160), y: Math.round(bounds.y + bounds.height / 2 - 150), width: 320, height: 270 } });
  otherMoves.push([path, `${move} · ${Math.round(time * 1000)} ms`]);
}
await context.close();
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const phone = await mobile.newPage(); await phone.goto(base + '/?debug=1'); await phone.waitForFunction(() => !!window.__HOP_DEBUG__); await phone.waitForTimeout(5000);
await phone.evaluate(() => { document.querySelector('.lil-gui')?.remove(); document.querySelector('.debug-metrics')?.remove(); for (const e of document.querySelectorAll('body > div')) if (e.style.position === 'fixed' && e.style.top === '0px') e.style.display = 'none'; document.activeElement?.blur(); });
await phone.screenshot({ path: `${folder}/home-mobile.png` });
const mobileMetrics = await phone.evaluate(() => window.__HOP_DEBUG__.snapshot()); await mobile.close();

const sheet = await browser.newPage({ deviceScaleFactor: 1 });
const dataImage = async path => 'data:image/png;base64,' + (await readFile(path)).toString('base64');
async function contact(name, title, entries, columns, width, imageHeight) {
  const images = await Promise.all(entries.map(async ([path, caption]) => `<figure><img src="${await dataImage(path)}"><figcaption>${caption}</figcaption></figure>`));
  await sheet.setViewportSize({ width, height: 100 + Math.ceil(entries.length / columns) * (imageHeight + 42) });
  await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#fff6e5;color:#1b1b2f;font:700 20px Arial}h1{font-size:24px;margin:20px}main{display:grid;grid-template-columns:repeat(${columns},1fr);padding:12px;gap:10px}figure{margin:0;text-align:center}img{width:100%;height:${imageHeight}px;object-fit:contain}figcaption{padding-top:5px;text-transform:uppercase}</style><h1>${title}</h1><main>${images.join('')}</main>`);
  await sheet.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
  await sheet.screenshot({ path: `${folder}/${name}.png` });
}
await contact('lineup', 'Final boxer gear · Blender 3/4 view', ANIMALS.map(n => [`art/previews/${n}.png`, n]), 3, 1200, 350);
await contact('grass-lineup', 'Actual Home camera · 55° pitch / 15° yaw · native desktop distance', crops.map((path, i) => [path, ANIMALS[i]]), 3, 1000, 220);
await contact('silhouettes', 'Silhouette recognition · final gear', ANIMALS.map(n => [`art/previews/${n}-silhouette.png`, n]), 3, 1200, 300);
await contact('fox-colors', 'One fox model · four player colors', [1, 2, 3, 4].map((n, i) => [`art/previews/fox-player-${n}.png`, ['Coral', 'Blue', 'Green', 'Purple'][i]]), 4, 1400, 320);
for (const move of ['tap', 'combo', 'victory']) await contact(move, `${move} · six runtime animation poses`, frames[move], 6, 1920, 270);
await contact('event-moves', 'Guard / hop follow-through / shove / stun / shoulder shake', otherMoves, 3, 1000, 270);
await contact('crowd', 'Instanced crowd · idle / both arms raised + jump', [['tmp/signoff/crowd-idle.png', 'Idle'], ['tmp/signoff/crowd-cheer.png', 'K.O. / win cheer']], 2, 800, 420);
await contact('logo-match', 'Blender preview / actual Home · same unlit vertex colors', [['art/previews/logo_street.png', 'Blender'], [`${folder}/home-desktop.png`, 'Production Home']], 2, 1600, 500);
await mkdir('art/review', { recursive: true });
await writeFile('art/review/browser-measurements.json', JSON.stringify({ productionUrl: base, cache: 'disabled and cleared; new context each run', timings, desktopMetrics, mobileMetrics, errors }, null, 2) + '\n');
const audit = JSON.parse(await readFile('art/review/geometry-audit.json', 'utf8'));
await sheet.setViewportSize({ width: 1200, height: 1000 });
await sheet.setContent(`<style>body{font:20px Arial;background:#fff6e5;color:#1b1b2f;padding:24px}h1{font-size:30px}table{border-collapse:collapse;width:100%;font-size:16px}td,th{padding:6px;text-align:left;border-bottom:1px solid #bbb}strong{font-size:24px}</style><h1>Production build · measured evidence</h1><p><strong>${audit.totalBytes.toLocaleString()} bytes / 2,000,000 budget</strong></p><p>Cold HTTP cache runs (desktop 1440×900): ${timings.map(t => (t.milliseconds / 1000).toFixed(3) + ' s').join(' · ')}</p><p>Every model response completed before Home became interactive: ${timings.every(t => t.lastModelMs < t.milliseconds)}</p><p>Medium: ${mobileMetrics.calls} draws · High: ${desktopMetrics.calls} draws · Browser errors: ${errors.length}</p><table><tr><th>Runtime model</th><th>Bytes</th><th>Open boundary segments</th><th>Flat meshes</th></tr>${audit.models.map(r => `<tr><td>${r.file}</td><td>${r.bytes.toLocaleString()}</td><td>${r.boundarySegments}</td><td>${r.flatMeshes}</td></tr>`).join('')}</table>`);
await sheet.screenshot({ path: `${folder}/measurements.png` });
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
