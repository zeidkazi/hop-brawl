import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { VIEW } from '../../shared/config';

test('keeps one canvas through menus, tier swaps, streaming and tile flips', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || (message.type() === 'warning' && /has been removed|deprecated/i.test(message.text()))) errors.push(message.text());
  });
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => !!window.__HOP_DEBUG__)).toBe(true);
  const canvas = await page.locator('#game-canvas').elementHandle();
  const initial = await page.evaluate(() => window.__HOP_DEBUG__!.snapshot());
  expect(initial.mobile).toBe(testInfo.project.name === 'mobile');
  expect(initial.rows).toBe(VIEW.POOL_ROWS);
  const baseline = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const gl = canvas.getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { ...window.__HOP_DEBUG__!.snapshot(), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable' };
  });
  expect(await page.evaluate(() => document.fonts.check('400 16px "Lilita One"') && document.fonts.check('800 16px Nunito'))).toBe(true);
  await page.getByRole('button', { name: 'Edit name' }).click();
  await page.getByPlaceholder('Your name').first().fill('Tester');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'Next animal' }).click();
  await expect(page.locator('#animal-label')).toHaveText('penguin');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#graphics').selectOption('low');
  await page.locator('#reducedMotion').check();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.snapshot().tier)).toBe('low');
  await page.keyboard.press('Escape');
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'MULTIPLAYER', exact: true }).click();
  await page.getByLabel('Room code letter 1').fill('a');
  await expect(page.getByLabel('Room code letter 2')).toBeFocused();
  await page.goBack();
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'How to Play', exact: true }).click();
  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page.locator('#how-card h3')).toHaveText('Shove to win.');
  await page.getByRole('button', { name: 'Got it!' }).click();
  await expect(page.locator('#home')).toBeVisible();
  // Redirect while the previous GSAP exit is still running.
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-screen="settings"]')!.click();
    history.back();
  });
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#home')).not.toHaveAttribute('inert', '');
  await page.evaluate(() => {
    const api = window.__HOP_DEBUG__!;
    api.graphics('high'); api.station('gameplay'); api.scroll(1000);
  });
  // Smoothed travel streams intermediate windows before reaching the requested row.
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.snapshot().generatedRows), { timeout: 10000 }).toBeGreaterThanOrEqual(initial.generatedRows + VIEW.POOL_ROWS);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.world.rows.some(slot => slot.z === 1000)), { timeout: 10000 }).toBe(true);
  await page.evaluate(() => { window.__HOP_DEBUG__!.graphics('low'); window.__HOP_DEBUG__!.particles(); });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => { window.__HOP_DEBUG__!.flip(); window.__HOP_DEBUG__!.toast('HOP!'); window.__HOP_DEBUG__!.toast('ROUND OVER'); window.__HOP_DEBUG__!.toast('WINNER!'); });
  await expect(page.locator('#tile-cover')).toBeHidden();
  expect(await canvas!.evaluate(element => element === document.querySelector('#game-canvas') && !!(element as HTMLCanvasElement).getContext('webgl2'))).toBe(true);
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#game-canvas')).toHaveCount(1);
  expect(await page.locator('.toast').count()).toBe(2);
  const final = await page.evaluate(() => window.__HOP_DEBUG__!.snapshot());
  expect(final.geometries).toBe(initial.geometries);
  expect(final.programs).toBe(initial.programs);
  expect(final.rows).toBe(initial.rows);
  expect(final.calls).toBeLessThan(80);
  expect(final.triangles).toBeLessThan(300000);
  expect(final.frames).toBeGreaterThan(initial.frames);
  await testInfo.attach('m2-render-metrics', { body: JSON.stringify({ initial, final }, null, 2), contentType: 'application/json' });
  await writeFile(testInfo.outputPath('m2-metrics.json'), JSON.stringify({ initial, baseline, final }, null, 2));
  if (process.env.HOP_CAPTURE_REVIEW) await page.screenshot({ path: testInfo.outputPath('m2-landscape.png') });
  expect(errors).toEqual([]);
});

test('deep links and denied storage keep the local menu usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
  });
  await page.goto('/?room=abcd');
  await expect(page.locator('#ui-root')).not.toHaveAttribute('inert', '', { timeout: 30000 });
  await page.locator('#home-name').fill('No storage');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#friends')).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel('Room code letter 1')).toHaveValue('A');
  await expect(page.getByLabel('Room code letter 4')).toHaveValue('D');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'Edit name' }).click();
  await page.getByPlaceholder('Your name').first().fill('No storage');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#settings-name')).toHaveValue('No storage');
  expect(await page.evaluate(() => window.__HOP_DEBUG__)).toBeUndefined();
});
