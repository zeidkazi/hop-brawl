import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const runs = [];
try {
  for (const [name, width, height, mobile] of [['desktop', 1440, 900, false], ['phone-emulation', 390, 844, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Motion test', animal: 2, sfx: 0, haptics: false })));
    await page.goto('http://127.0.0.1:8787/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
    await page.getByRole('button', { name: 'SOLO', exact: true }).click();
    await page.waitForFunction(() => ['playing', 'paused'].includes(window.__HOP_DEBUG__.solo.phase));
    if (await page.evaluate(() => window.__HOP_DEBUG__.solo.phase === 'paused')) {
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
    }
    const result = await page.evaluate(() => new Promise(resolve => {
      const api = window.__HOP_DEBUG__, solo = api.solo, game = solo.game, move = solo.movement;
      // Safe grass allows sustained input sampling without random deaths truncating the measurement.
      move.x = move.fromX = move.toX = 4; move.z = move.fromZ = move.toZ = 4;
      const stamps = [], heights = []; let next = performance.now() + 1000, side = false, begun = 0;
      game.onFrame = now => {
        if (now >= next) { solo.input.enabled && window.dispatchEvent(new KeyboardEvent('keydown', { key: side ? 'ArrowLeft' : 'ArrowRight' })); side = !side; next = now + 220; begun ||= now; }
        if (!begun) return;
        stamps.push(now); heights.push(game.home.animalRoot.position.y);
        if (now - begun < 10000) return;
        game.onFrame = null;
        const deltas = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
        resolve({ frames: stamps.length, seconds: (now - begun) / 1000, fps: (stamps.length - 1) * 1000 / (now - begun),
          p95Ms: deltas[Math.ceil(deltas.length * .95) - 1], maxMs: deltas.at(-1),
          maxArcHeight: Math.max(...heights), hops: move.hops, phase: solo.phase, graphics: api.snapshot() });
      };
    }));
    runs.push({ name, viewport: [width, height], ...result, errors });
    await context.close();
  }
} finally { await browser.close(); }
await mkdir('art/review/batch-a', { recursive: true });
await writeFile('art/review/batch-a/performance.json', JSON.stringify({ localProductionWorker: true, physicalPhone: false, runs }, null, 2) + '\n');
console.log(JSON.stringify(runs, null, 2));
if (runs.some(run => run.errors.length || run.hops < 35 || run.phase !== 'playing' || run.maxArcHeight < .35)) throw new Error('Movement frame verification failed');
