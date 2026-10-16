import { expect, test } from '@playwright/test';
for (const hz of [90, 144]) test(`renders every ${hz}Hz callback through an impact`, async ({ page }) => {
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  const trace = await page.evaluate(hz => {
    const game = window.__HOP_DEBUG__!.solo.game;
    game.setGraphics('low'); cancelAnimationFrame(Reflect.get(game, 'frameId'));
    const raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
    const camera = game.rig.update.bind(game.rig), world = game.world.update.bind(game.world);
    const deltas: number[] = [], times: number[] = [];
    game.rig.update = (dt, t) => { deltas.push(dt); camera(dt, t); };
    game.world.update = t => { times.push(t); world(t); };
    game.beforeFrame = null; game.onFrame = null;
    Reflect.set(game, 'previous', 1000); Reflect.set(game, 'clockStart', 1000);
    const before = game.metrics.frames; game.impact(true);
    for (let i = 1; i <= hz; i++) Reflect.get(game, 'frame')(1000 + i * 1000 / hz);
    window.requestAnimationFrame = raf;
    return { deltas, times, draws: game.metrics.frames - before };
  }, hz);
  expect(trace.draws).toBe(hz); expect(trace.times).toHaveLength(hz);
  for (const dt of trace.deltas) expect(dt).toBeCloseTo(1 / hz, 10);
  trace.times.forEach((time, i) => expect(time).toBeCloseTo((i + 1) / hz, 10));
});
