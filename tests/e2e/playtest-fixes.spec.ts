import { test, expect } from '@playwright/test';

test('section 31 measured playfield width and readable animal', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Framing', animal: 2, sfx: 0 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  const metrics = await page.evaluate(() => {
    const solo = window.__HOP_DEBUG__!.solo, game = solo.game, camera = game.rig.camera;
    const point = camera.position.clone();
    const width = (left: number, right: number) => {
      const a = point.set(left, 0, -solo.movement.z).project(camera).x;
      return (point.set(right, 0, -solo.movement.z).project(camera).x - a) * 50;
    };
    let top = Infinity, bottom = -Infinity;
    game.home.animalRoot.updateMatrixWorld(true);
    game.home.animalRoot.traverse(node => {
      let visible = true; for (let parent: typeof node | null = node; parent; parent = parent.parent) if (!parent.visible) visible = false;
      const geometry = (node as any).geometry;
      if (!visible || !geometry) return;
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
        const y = (1 - point.y) * innerHeight / 2; top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    });
    return { playableWidthPercent: width(-.5, 8.5), withMarginsPercent: width(-1, 9), animalHeightPx: bottom - top };
  });
  await info.attach('framing-measurements', { body: JSON.stringify(metrics), contentType: 'application/json' });
  console.log(info.project.name, JSON.stringify(metrics));
  if (info.project.name === 'mobile') expect(metrics.playableWidthPercent).toBeGreaterThanOrEqual(88);
  else { expect(metrics.playableWidthPercent).toBeGreaterThanOrEqual(45); expect(metrics.animalHeightPx).toBeGreaterThanOrEqual(48); }
});

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
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'over', undefined, { timeout: 45000 });
  const frames = await page.evaluate(() => (window as any).deathFrames as { y: number; lag: number }[]);
  expect(frames.length).toBeGreaterThan(0);
  // The owner replaced the old .05-tile snap clamp with a .22 s follow response.
  // Fairness is the actual rendered bottom edge, not the now-intentional smoothing lag.
  for (const frame of frames) expect(frame.y).toBeGreaterThanOrEqual(.999);
  if (process.env.HOP_CAPTURE_REVIEW) await page.screenshot({ path: info.outputPath('left-behind-bottom.png') });
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
