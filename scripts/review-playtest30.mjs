import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Review-only lookahead drives the real Movement.input path. No invulnerability,
// teleporting, hazard changes, or production bot code. Freeze only to take each PNG.
const folder = 'art/previews/playtest30'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const report = [];
try {
  for (const [name, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Brawler', animal: 2, sfx: 0, haptics: false })));
    await page.goto('http://127.0.0.1:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
    await page.evaluate(() => document.querySelectorAll('.debug-metrics,.lil-gui,body>div:not([id])').forEach(node => { node.hidden = true; }));
    await page.getByRole('button', { name: 'SOLO', exact: true }).click();
    await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
    await page.evaluate(() => {
      const solo = window.__HOP_DEBUG__.solo, game = solo.game;
      game.world.reset(42);
      const original = game.beforeFrame;
      const review = window.runReview = { target: 5, hold: false, captures: [], decisions: 0, maxPlanMs: 0 };
      let nextDecision = 0;
      const clone = source => Object.assign(new source.constructor(source.rowAt), source, {
        hazard: { ...source.hazard }, landing: { ...source.landing },
        onHop: null, onLand: null, onBonk: null, onDeath: null, belowScreen: null,
      });
      const choices = ['up', 'left', 'right', 'wait', 'down'];
      game.beforeFrame = (now, dt) => {
        if (review.hold) { original(solo.previousWall, 0); return; }
        original(now, dt);
        const player = solo.movement;
        if (solo.phase !== 'playing' || player.hopping) return;
        if (player.z >= review.target) {
          review.hold = true;
          review.captures.push({ row: player.z, x: player.x, time: player.time, hops: player.hops, camZ: player.camZ, dead: player.dead });
          return;
        }
        if (player.time < nextDecision) return;
        const started = performance.now();
        let states = [{ player: clone(player), first: null, score: 0 }];
        for (let depth = 0; depth < 5; depth++) {
          const next = [];
          for (const state of states) for (const action of choices) {
            const trial = clone(state.player);
            if (action !== 'wait' && !trial.input(action)) continue;
            trial.advance(trial.time + .17);
            if (trial.dead) continue;
            next.push({ player: trial, first: state.first ?? action,
              score: trial.z * 10 - Math.abs(trial.x - 4) * .15 - (action === 'down' ? .1 : 0) });
          }
          if (!next.length) break;
          next.sort((a, b) => b.score - a.score); states = next.slice(0, 12);
        }
        const action = states[0]?.first;
        if (action && action !== 'wait') player.input(action);
        nextDecision = player.time + .17;
        review.decisions++; review.maxPlanMs = Math.max(review.maxPlanMs, performance.now() - started);
      };
    });
    for (const row of [5, 35, 70]) {
      await page.waitForFunction(() => window.runReview.hold || ['over', 'dying', 'paused'].includes(window.__HOP_DEBUG__.solo.phase), undefined, { timeout: 120000 });
      const state = await page.evaluate(() => ({ phase: window.__HOP_DEBUG__.solo.phase, ...window.runReview, dead: window.__HOP_DEBUG__.solo.movement.dead, z: window.__HOP_DEBUG__.solo.movement.z }));
      if (!state.hold) throw new Error(`${name}: run stopped ${JSON.stringify(state)}`);
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${folder}/${name}-row${row}.png` });
      console.log(name, 'captured', row, JSON.stringify(state.captures.at(-1)));
      if (row !== 70) await page.evaluate(target => {
        window.runReview.target = target; window.runReview.hold = false;
        window.__HOP_DEBUG__.solo.previousWall = performance.now();
      }, row === 5 ? 35 : 70);
    }
    report.push(await page.evaluate(({ name, viewport, errors }) => ({ name, viewport, errors, seed: 42,
      run: window.runReview, performance: window.__HOP_DEBUG__.snapshot() }), { name, viewport, errors }));
    await context.close();
  }
  await writeFile('art/review/playtest30-run.json', JSON.stringify(report, null, 2) + '\n');
  const coldLoads = [];
  for (let i = 0; i < 5; i++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.goto('http://127.0.0.1:4173/'); await page.locator('#loading').waitFor({ state: 'hidden' });
    coldLoads.push(await page.evaluate(() => performance.getEntriesByName('hop-brawl-interactive')[0].startTime));
    await context.close();
  }
  await writeFile('art/review/playtest30-loading.json', JSON.stringify({ coldCache: true, production: true, coldLoads,
    maxMs: Math.max(...coldLoads), medianMs: [...coldLoads].sort((a, b) => a - b)[2] }, null, 2) + '\n');
} finally { await browser.close(); }
