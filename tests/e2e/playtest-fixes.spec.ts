import { test, expect } from '@playwright/test';

test('LEFT BEHIND renders at the bottom edge; long frames pause without moving the player', async ({ page }, info) => {
  test.setTimeout(60000);
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Fairness', sfx: 0 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(180);
  const before = await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.z);
  await page.evaluate(() => { const until = performance.now() + 300; while (performance.now() < until) { /* injected hitch */ } });
  await expect(page.locator('#pause')).toBeVisible();
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.z)).toBe(before);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  // Observe the actual render call for every Left Behind death in this run.
  await page.evaluate(() => {
    const solo = window.__HOP_DEBUG__!.solo, renderer = solo.game.renderer;
    const render = renderer.render.bind(renderer);
    (window as any).deathFrames = [];
    renderer.render = (...args) => {
      render(...args);
      if (solo.movement.dead === 'LEFT BEHIND!') (window as any).deathFrames.push({
        y: solo.game.rig.screenY(solo.movement.x, solo.movement.z), lag: Math.abs(solo.movement.camZ - solo.game.rig.camZ) });
    };
  });
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'over');
  const frames = await page.evaluate(() => (window as any).deathFrames as { y: number; lag: number }[]);
  expect(frames.length).toBeGreaterThan(0);
  for (const frame of frames) { expect(frame.y).toBeGreaterThanOrEqual(.999); expect(frame.lag).toBeLessThanOrEqual(.05); }
  await page.screenshot({ path: info.outputPath('left-behind-bottom.png') });
});

test('name dialog disappears completely and logo returns to its exact pose after a hitch', async ({ page }) => {
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'Edit name' }).click();
  await page.getByPlaceholder('Your name').first().fill('No Ghost');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#name')).toBeHidden();
  expect(await page.locator('#name').evaluate(node => getComputedStyle(node).opacity)).toBe('0');
  const poses = await page.evaluate(async () => {
    const home = window.__HOP_DEBUG__!.solo.game.home;
    home.finishIntro();
    const pose = () => home.logo.children.map(node => [...node.position.toArray(), ...node.scale.toArray()]);
    const expected = pose(); home.playIntro();
    await new Promise(resolve => setTimeout(resolve, 90));
    const end = performance.now() + 300; while (performance.now() < end) { /* injected hitch */ }
    await new Promise(resolve => setTimeout(resolve, 100));
    return { expected, actual: pose() };
  });
  expect(poses.actual).toEqual(poses.expected);
});
