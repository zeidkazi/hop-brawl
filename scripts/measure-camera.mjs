import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const runs = [];
try {
  for (const [width, height] of [[1440,900],[390,844]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
    await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Camera run', music: .35, sfx: .8 })));
    await page.goto('http://127.0.0.1:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
    await page.waitForTimeout(1500); await page.getByRole('button', { name: 'SOLO', exact: true }).click();
    await page.waitForFunction(() => ['playing','paused'].includes(window.__HOP_DEBUG__.solo.phase));
    if (await page.evaluate(() => window.__HOP_DEBUG__.solo.phase === 'paused')) await page.getByRole('button', { name: 'Resume', exact: true }).click();
    const frames = await page.evaluate(() => new Promise(resolve => {
      const solo = window.__HOP_DEBUG__.solo, game = solo.game, move = solo.movement;
      // Safe grass fixture isolates camera continuity from hazard deaths and log carrying.
      const grass = move.rowAt(0); move.rowAt = z => ({ ...grass, z, obstacles: [] });
      const before = game.beforeFrame, frames = []; let started = false;
      game.beforeFrame = (now, dt) => {
        if (!move.hopping && move.hops < 20) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); started = true; }
        before(now, dt);
        game.rig.shake = 0; // Deliberate train/death shake is outside the normal-hop measurement.
      };
      game.onFrame = now => {
        if (!started) return;
        const p = game.rig.camera.position;
        frames.push({ time: now, x: p.x, y: p.y, z: p.z, hops: move.hops, height: game.home.animalRoot.position.y });
        if (move.hops >= 20) { game.beforeFrame = before; game.onFrame = null; resolve(frames); }
      };
    }));
    const steps = frames.slice(1).map((p,i) => Math.hypot(p.x-frames[i].x,p.y-frames[i].y,p.z-frames[i].z)).sort((a,b)=>a-b);
    const median = steps[Math.floor(steps.length/2)], max = steps.at(-1);
    runs.push({ viewport: [width,height], medianStep: median, maxStep: max, ratio: max / median, frames });
    await page.close();
  }
} finally { await browser.close(); }
await mkdir('art/review/batch-b-stable', { recursive: true });
await writeFile('art/review/batch-b-stable/camera-20-hops.json', JSON.stringify(runs,null,2)+'\n');
console.log(JSON.stringify(runs.map(({frames,...run})=>({ ...run, frames: frames.length })),null,2));
if (runs.some(r=>r.ratio>2)) throw new Error('Camera step exceeded twice the median');
