import { expect, test } from '@playwright/test';

test('Solo plays, buffers one hop, pauses, dies and retries without replacing the canvas', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => !!window.__HOP_DEBUG__), { timeout: 20000 }).toBe(true);
  const canvas = await page.locator('#game-canvas').elementHandle();
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.getByPlaceholder('Your name').first().fill('Solo Tester');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('countdown');
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.z)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  if (testInfo.project.name === 'mobile') {
    await page.touchscreen.tap(160, 500);
  } else await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.z)).toBe(2);
  await page.screenshot({ path: testInfo.outputPath('solo-playing.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#pause')).toBeVisible();
  const paused = await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.time);
  await page.waitForTimeout(300); expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.time)).toBe(paused);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await expect(page.locator('#pause')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  await page.evaluate(() => { window.__HOP_DEBUG__!.solo.movement.z = -1; });
  await expect(page.locator('#soloEnd')).toBeVisible(); await expect(page.locator('#solo-end-title')).toHaveText('LEFT BEHIND!');
  await page.screenshot({ path: testInfo.outputPath('solo-over.png') });
  const start = Date.now(); await page.getByRole('button', { name: 'RETRY', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('countdown');
  expect(Date.now() - start).toBeLessThan(1000);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.distance)).toBe(0);
  expect(await page.evaluate(element => element === document.querySelector('#game-canvas'), canvas)).toBe(true);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Quit to menu', exact: true }).click();
  await expect(page.locator('#home')).toBeVisible(); expect(errors).toEqual([]);
});

test('swipes commit at the threshold, ignore repeat keys, and blur pauses Solo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Touch' })));
  await page.goto('/?debug=1'); await expect.poll(() => page.evaluate(() => !!window.__HOP_DEBUG__), { timeout: 20000 }).toBe(true);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  await page.mouse.move(190, 500); await page.mouse.down(); await page.mouse.move(215, 500);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.x)).toBe(5);
  await page.mouse.move(250, 500); await page.mouse.up(); await page.waitForTimeout(170);
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.x)).toBe(5);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true })));
  await page.waitForTimeout(170); expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.x)).toBe(5);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause')).toBeVisible();
});
