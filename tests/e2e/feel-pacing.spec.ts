import { expect, test } from '@playwright/test';
test('Solo warns after seven idle seconds, sweeps at nine and respects Reduce Motion impacts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Pacing', animal: 2 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click(); await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  await page.keyboard.press('ArrowUp'); await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.movement.hops === 1);
  await page.evaluate(() => { const s = window.__HOP_DEBUG__!.solo; Reflect.set(s.pacing, 'progressed', s.movement.time - 7.1); });
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.pacing.warning)).toBe(true);
  expect(await page.evaluate(() => Number(getComputedStyle(document.querySelector('#solo-danger')!).opacity))).toBeGreaterThan(0);
  await page.evaluate(() => { const s = window.__HOP_DEBUG__!.solo; Reflect.set(s.pacing, 'progressed', s.movement.time - 9.1); });
  await expect(page.locator('#solo-end-title')).toHaveText('LEFT BEHIND!');
  const impact = await page.evaluate(() => {
    const game = window.__HOP_DEBUG__!.solo.game; game.setReducedMotion(true);
    const before = Reflect.get(game, 'hitstopUntil'); game.impact(true);
    return { before, after: Reflect.get(game, 'hitstopUntil'), flash: document.querySelector('.impact-flash')!.getAnimations().length };
  });
  expect(impact.after).toBe(impact.before); expect(impact.flash).toBe(0);
});
