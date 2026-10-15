import { expect, test } from '@playwright/test';
test('hop feedback is immediate and any key or blank tap retries within the reveal', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Instant', animal: 2 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'playing');
  const immediate = await page.evaluate(() => {
    const solo = window.__HOP_DEBUG__!.solo, sound = solo.game.home.sound, original = sound.play.bind(sound), cues: string[] = [];
    sound.play = (...args: Parameters<typeof sound.play>) => { cues.push(args[0]); return original(...args); };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); sound.play = original;
    return { cues, hopping: solo.movement.hopping };
  });
  expect(immediate.hopping).toBe(true); expect(immediate.cues).toContain('hop');
  await expect.poll(() => page.locator('#solo-distance').textContent()).toBe('2');
  for (const trigger of ['key', 'tap']) {
    await page.evaluate(() => { const solo = window.__HOP_DEBUG__!.solo; Reflect.get(solo.movement, 'kill').call(solo.movement, 'FLATTENED!'); });
    await page.waitForFunction(() => window.__HOP_DEBUG__!.solo.phase === 'over');
    const result = await page.evaluate(async trigger => {
      const start = performance.now();
      if (trigger === 'key') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      else document.querySelector('#game-canvas')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise<void>(resolve => { const poll = () => window.__HOP_DEBUG__!.solo.phase === 'playing' ? resolve() : requestAnimationFrame(poll); requestAnimationFrame(poll); });
      return { ms: performance.now() - start, score: window.__HOP_DEBUG__!.solo.movement.distance };
    }, trigger);
    expect(result.ms).toBeLessThan(470); // 400 ms timeline plus at most a few scheduling frames.
    expect(result.score).toBe(0);
  }
});

