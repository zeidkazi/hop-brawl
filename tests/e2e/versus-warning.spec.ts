import { expect, test } from '@playwright/test';
test.use({ trace: 'off', actionTimeout: 10000 });
test('idle Versus shows danger for .8s before death on desktop and phone viewports', async ({ browser, page }) => {
  test.setTimeout(90000);
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await guestContext.newPage();
  try {
    for (const [tab, name] of [[page, 'Host'], [guest, 'Guest']] as const) {
      await tab.addInitScript(name => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name, animal: 2, music: 0, sfx: 0 })), name);
      await tab.goto('http://127.0.0.1:5173/?debug=1'); await tab.waitForFunction(() => !!window.__HOP_DEBUG__); console.log('Loaded', name);
    }
    await page.getByRole('button', { name: 'MULTIPLAYER', exact: true }).click(); await page.locator('[data-room=create]').click();
    await expect(page.locator('#lobby')).toBeVisible(); const code = await page.locator('#lobby-code').innerText(); console.log('Created room', code);
    await guest.getByRole('button', { name: 'MULTIPLAYER', exact: true }).click();
    for (let i = 0; i < code.length; i++) await guest.getByLabel(`Room code letter ${i + 1}`).fill(code[i]!); await guest.locator('[data-room=join]').click();
    await expect(guest.locator('#lobby')).toBeVisible(); console.log('Guest joined'); await page.locator('[data-room=start]').click();
    for (const tab of [page, guest]) await tab.waitForFunction(() => window.__HOP_DEBUG__!.versus.client.state?.phase === 'playing');
    const results = await Promise.all([page, guest].map(tab => tab.evaluate(() => new Promise<{ warningMs: number; y: number; cause: string | null; urgent: boolean }>(resolve => {
      const versus = window.__HOP_DEBUG__!.versus; let first = 0, urgent = false;
      const sample = () => {
        const me = versus.client.state!.players.find(p => p.id === versus.client.id)!;
        if (Number(getComputedStyle(document.querySelector('#match-danger')!).opacity) > 0 && !first) first = performance.now();
        urgent ||= document.querySelector(`#match-name-${me.slot}`)!.textContent!.includes('!');
        if (me.movement.dead || versus.client.prediction.dead) resolve({ warningMs: first ? performance.now() - first : 0, y: versus.game.rig.screenY(me.movement.x, me.movement.z), cause: me.movement.dead ?? versus.client.prediction.dead, urgent });
        else requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    }))));
    console.log('Versus visible warnings', JSON.stringify(results));
    for (const result of results) { expect(result.warningMs).toBeGreaterThanOrEqual(800); expect(result.y).toBeGreaterThanOrEqual(.999); expect(result.urgent).toBe(true); expect(result.cause).toBe('LEFT BEHIND!'); }
  } finally { await guestContext.close(); }
});
