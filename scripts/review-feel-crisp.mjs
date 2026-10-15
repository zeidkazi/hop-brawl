import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2] ?? 'before', dir = 'output/playwright/feel';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const results = [];
try {
  for (const dpr of [1, 1.25, 2, 3]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Crisp test', animal: 2, reducedMotion: true, music: 0, sfx: 0 })));
    await page.goto('http://127.0.0.1:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
    await page.getByRole('button', { name: 'SOLO', exact: true }).click();
    await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
    await page.evaluate(() => {
      const solo = window.__HOP_DEBUG__.solo, game = solo.game;
      solo.pause(); game.beforeFrame = null; game.onFrame = null;
      document.querySelector('#ui-root').style.visibility = 'hidden';
      game.world.reset(1337); game.rig.targetCamZ = 0; game.rig.leaderZ = 1;
      game.worldTime = 5; game.quality.choice = 'high'; game.quality.tier = 'medium'; game.quality.resolution = 1;
      game.applyQuality(); game.home.reviewMove('guard', 0); game.home.animalRoot.position.set(4, 0, -1);
    });
    await page.waitForTimeout(800);
    const data = await page.evaluate(() => {
      const g = window.__HOP_DEBUG__.solo.game, c = g.canvas;
      return { ...window.__HOP_DEBUG__.snapshot(), canvas: [c.width,c.height], target: [g.target.width,g.target.height], antialias: c.getContext('webgl2').getContextAttributes().antialias };
    });
    await page.screenshot({ path: `${dir}/${label}-dpr-${dpr}.png`, clip: { x: 20, y: 260, width: 350, height: 450 } });
    results.push({ dpr, ...data, errors }); await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${dir}/${label}-crisp.json`, JSON.stringify(results,null,2));
console.log(results.map(r => ({ dpr: r.dpr, ratio: r.pixelRatio, canvas: r.canvas, target: r.target, antialias: r.antialias, errors: r.errors })));
if (results.some(r => r.errors.length)) throw Error('Capture had browser errors');
