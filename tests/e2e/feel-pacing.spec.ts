import { expect, test } from '@playwright/test';
test('idle Solo warns visibly for at least 0.8 seconds before the rendered edge kills', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Pacing', animal: 2 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click(); await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  await page.keyboard.press('ArrowUp'); await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.movement.hops === 1);
  const result = await page.evaluate(async () => {
    const solo = window.__HOP_DEBUG__!.solo;
    let first = 0;
    return new Promise<{ warningMs: number; y: number; cause: string | null }>(resolve => {
      const sample = () => {
        if (Number(getComputedStyle(document.querySelector('#solo-danger')!).opacity) > 0 && !first) first = performance.now();
        if (solo.movement.dead) resolve({ warningMs: first ? performance.now() - first : 0, y: solo.game.rig.screenY(solo.movement.x, solo.movement.z), cause: solo.movement.dead });
        else requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    });
  });
  expect(result.cause).toBe('LEFT BEHIND!'); expect(result.warningMs).toBeGreaterThanOrEqual(800); expect(result.y).toBeGreaterThanOrEqual(.999);
  await page.waitForTimeout(200);
  const flashes = await page.evaluate(() => { const game = window.__HOP_DEBUG__!.solo.game; game.setReducedMotion(true); game.impact(true); return document.querySelector('.impact-flash')!.getAnimations().length; });
  expect(flashes).toBe(0);
});
