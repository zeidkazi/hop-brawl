import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Visibility', animal: 2, music: .35, sfx: .8 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
});
test('pagehide suspends audio and cancels rendering; return fades in and Solo stays paused', async ({ page }) => {
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.context)).toBe('suspended');
  const hidden = await page.evaluate(() => {
    const game = window.__HOP_DEBUG__!.solo.game;
    return { frames: game.metrics.frames, raf: Reflect.get(game, 'frameId'), phase: window.__HOP_DEBUG__!.solo.phase };
  });
  expect(hidden.raf).toBe(0); expect(hidden.phase).toBe('paused');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.snapshot().frames)).toBe(hidden.frames);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.context)).toBe('running');
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.snapshot().frames)).toBeGreaterThan(hidden.frames);
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('paused');
  // Exercise the visibilitychange route independently, including rapid hide/show races.
  await page.evaluate(() => {
    for (const hidden of [true, false, true]) {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.context)).toBe('suspended');
  await page.evaluate(() => { delete (document as unknown as { hidden?: boolean }).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.context)).toBe('running');
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('paused');
});
test('returning to a room requests a fresh authoritative snapshot', async ({ page }) => {
  let syncs = 0;
  page.on('websocket', socket => socket.on('framesent', frame => { if (String(frame.payload).includes('"type":"sync"')) syncs++; }));
  await page.getByRole('button', { name: 'MULTIPLAYER', exact: true }).click();
  await page.locator('[data-room=create]').click(); await expect(page.locator('#lobby')).toBeVisible();
  const before = syncs;
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow')); });
  await expect.poll(() => syncs).toBeGreaterThan(before);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.versus.client.ready)).toBe(true);
  await page.locator('#lobby [data-room=leave]').click();
});
