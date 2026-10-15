import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Review fixtures use the real seeded world, shared collision rules and production pose methods.
// Only the clock/camera and starting position are controlled; no replacement animation is drawn.
const output = 'art/review/batch-a', raw = 'output/playwright/batch-a';
await mkdir(output, { recursive: true }); await mkdir(raw, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Batch A', animal: 2, sfx: 0, haptics: false, reducedMotion: false })));
await page.goto('http://127.0.0.1:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
await page.getByRole('button', { name: 'SOLO', exact: true }).click();
await page.waitForFunction(() => ['playing', 'paused'].includes(window.__HOP_DEBUG__.solo.phase));
if (await page.evaluate(() => window.__HOP_DEBUG__.solo.phase === 'paused')) {
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
}
const manifest = [];
const hazardsUrl = '/@fs/' + fileURLToPath(new URL('../shared/hazards.ts', import.meta.url)).replaceAll('\\', '/');
for (const kind of ['hop', 'log-landing', 'flattened', 'splash']) {
  const fixture = await page.evaluate(async ({ kind, hazardsUrl }) => {
    const api = window.__HOP_DEBUG__, solo = api.solo, game = solo.game, move = solo.movement;
    cancelAnimationFrame(game.frameId); game.frameId = 0;
    document.querySelector('#ui-root').style.display = 'none';
    document.querySelectorAll('.debug-metrics,.lil-gui,body>div:not([id])').forEach(e => e.style.display = 'none');
    const hazards = await import(hazardsUrl);
    game.world.reset(42); move.reset(); solo.phase = 'playing'; solo.poseTime = 0; solo.deathAt = 0;
    solo.newBest = true; solo.facing.reset(); game.home.setActorOpacity(1); game.home.animalRoot.visible = true;
    solo.deathEffects.root.visible = false; game.desaturation.value = 0; game.world.deathCause = null;
    for (let i = 0; i < game.particles.pool.items.length; i++) game.particles.pool.release(i);
    let x = 4, z = 1, start = 0;
    if (kind === 'log-landing' || kind === 'splash') {
      z = Array.from({ length: 60 }, (_, z) => z).find(z => game.world.rowAt(z).kind === 'river' && game.world.rowAt(z - 1).kind === 'grass');
      const row = game.world.rowAt(z), slot = { log: -1, slot: -1, x: 0 };
      if (kind === 'log-landing') {
        x = Array.from({ length: 7 }, (_, i) => i + 1).find(x => {
          hazards.logSlotAtLanding(row, x, .14, slot);
          return slot.log >= 0 && Math.abs(slot.x - x) > .15 && !game.world.rowAt(z - 1).obstacles.some(o => o.column === x);
        });
        if (x === undefined) throw new Error('No curved log landing fixture');
        z--;
      } else {
        // Find genuine unsupported water between the visible logs.
        x = Array.from({ length: 81 }, (_, i) => i / 10).find(x => row.logs.every(log => Math.abs(x - hazards.laneItemX(row, log, 0)) > log.length / 2));
        if (x === undefined) throw new Error('No open water fixture');
      }
    } else if (kind === 'flattened') {
      z = 5; const row = game.world.rowAt(z);
      for (start = 0; start < 10; start += .01) {
        const car = row.vehicles.find(car => { const at = hazards.laneItemX(row, car, start); return at > 3 && at < 5; });
        if (car) { x = hazards.laneItemX(row, car, start); break; }
      }
    }
    move.x = move.fromX = move.toX = x; move.z = move.fromZ = move.toZ = z;
    move.time = start; move.camZ = Math.max(0, z - 3); move.externalCamera = true;
    game.rig.resetScroll(true); game.rig.targetCamZ = move.camZ; game.rig.leaderZ = z;
    game.rig.update(1, 0); game.world.prepareWindow(move.camZ);
    game.world.setView(game.rig.camera); solo.boxer.play('guard');
    if (kind === 'hop' || kind === 'log-landing') move.input('up');
    else move.advance(start + .001);
    if (kind === 'flattened' && move.dead !== 'FLATTENED!' || kind === 'splash' && move.dead !== 'SPLASH!') throw new Error('Fixture did not trigger its real collision');
    game.rig.station = 'gameplay';
    window.batchFixture = { start, previous: 0 };
    const center = game.home.animalRoot.position.clone().set(x, .5, -z).project(game.rig.camera);
    const clip = { x: Math.round(Math.max(0, Math.min(960, (center.x + 1) * 720 - 240))),
      y: Math.round(Math.max(0, Math.min(500, (1 - center.y) * 450 - 200))), width: 480, height: 400 };
    return { kind, x, z, start, cause: move.dead, toX: move.toX, toZ: move.toZ, clip };
  }, { kind, hazardsUrl });
  const times = kind === 'hop' ? [0, 20, 60, 78, 127, 160] : kind === 'log-landing' ? [0, 20, 60, 78, 127, 210] : [0, 80, 180, 350, 600, 900];
  const frames = [];
  for (const ms of times) {
    const pose = await page.evaluate(ms => {
      const solo = window.__HOP_DEBUG__.solo, game = solo.game, move = solo.movement, f = window.batchFixture;
      const dt = (ms - f.previous) / 1000; f.previous = ms;
      solo.poseTime = ms / 1000;
      if (!move.dead) move.advance(f.start + ms / 1000);
      solo.renderPose(dt); game.rig.shake = 0;
      game.world.animalX = move.x; game.world.animalZ = move.z;
      game.world.update(f.start + ms / 1000); game.particles.update(dt); game.draw();
      const actor = game.home.animalRoot;
      return { ms, x: actor.position.x, y: actor.position.y, z: actor.position.z, scale: actor.scale.toArray(), onLog: move.onLog, cause: move.dead };
    }, ms);
    const path = `${raw}/${kind}-${ms}.png`; await page.screenshot({ path, clip: fixture.clip });
    frames.push({ path, ...pose });
  }
  manifest.push({ ...fixture, frames });
}
if (errors.length) throw new Error(errors.join('\n'));
await writeFile(`${output}/frames.json`, JSON.stringify({ viewport: [1440, 900], fixtures: manifest, errors }, null, 2) + '\n');
const sheet = await browser.newPage({ viewport: { width: 2880, height: 448 } });
await sheet.setContent('<style>body{margin:0}</style><canvas width="2880" height="448"></canvas>');
for (const fixture of manifest) {
  const frames = await Promise.all(fixture.frames.map(async frame => ({ ...frame, image: 'data:image/png;base64,' + (await readFile(frame.path)).toString('base64') })));
  await sheet.evaluate(async ({ kind, frames }) => {
    const ctx = document.querySelector('canvas').getContext('2d');
    ctx.fillStyle = '#1B1B2F'; ctx.fillRect(0, 0, 2880, 448); ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#FFF6E5';
    for (let i = 0; i < frames.length; i++) {
      const image = new Image(); image.src = frames[i].image; await image.decode();
      ctx.drawImage(image, i * 480, 48); ctx.fillText(kind.toUpperCase() + '  ' + frames[i].ms + ' ms', i * 480 + 14, 32);
    }
  }, { kind: fixture.kind, frames });
  await sheet.screenshot({ path: `${output}/${fixture.kind}.png` });
}
await browser.close();
console.log(JSON.stringify(manifest.map(({ kind, cause, frames }) => ({ kind, cause, frames: frames.length })), null, 2));
