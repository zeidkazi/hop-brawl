import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { RoomSnapshot } from '../../shared/room';

const base = process.env.HOP_TEST_URL ?? 'http://127.0.0.1:5173';
function observe(page: Page) {
  const state = { current: null as RoomSnapshot | null, id: '', errors: [] as string[] };
  page.on('pageerror', error => state.errors.push(error.message));
  page.on('websocket', socket => socket.on('framereceived', frame => {
    try { const message = JSON.parse(String(frame.payload)) as { snapshot?: RoomSnapshot; id?: string };
      if (message.snapshot) {
        if (state.current?.phase !== message.snapshot.phase) console.log('PHASE', message.snapshot.phase, message.snapshot.round, message.snapshot.players.map(p => `${p.name}:${p.hearts}:${p.wins}`).join(','));
        state.current = message.snapshot;
      } if (message.id) state.id = message.id;
    } catch { /* Auto-response ping/pong is deliberately plain text. */ }
  }));
  return state;
}
async function open(page: Page, name: string, animal: number, suffix = '') {
  await page.addInitScript(({ name, animal }) => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name, animal, sfx: 0, reducedMotion: true })), { name, animal });
  await page.goto(base + '/' + suffix); await expect(page.locator('#ui-root')).not.toHaveAttribute('inert', '', { timeout: 30000 });
}

test('private room: isolated browsers play three rounds, rematch and hand off host', async ({ browser, page }) => {
  test.setTimeout(180000);
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await guestContext.newPage(), hostState = observe(page), guestState = observe(guest);
  try {
    await open(page, 'Coral', 2); await page.locator('[data-screen="friends"]').click(); await page.locator('[data-room="create"]').click();
    await expect(page.locator('#lobby')).toBeVisible(); const code = await page.locator('#lobby-code').innerText();
    await expect(page.locator('[data-room="start"]')).toBeDisabled();
    await open(guest, 'Mint', 4, `?room=${code}`); await guest.locator('[data-room="join"]').click();
    await expect(guest.locator('#lobby')).toBeVisible(); await expect(page.locator('[data-room="start"]')).toBeEnabled();
    await guest.locator('[data-room-animal="5"]').click();
    await expect.poll(() => hostState.current?.players.find(p => p.id === guestState.id)?.animal).toBe(5);
    await page.locator('[data-room="start"]').click();
    for (let round = 1; round <= 3; round++) {
      await expect.poll(() => hostState.current?.phase, { timeout: 15000 }).toBe('playing');
      expect(guestState.current?.seed).toBe(hostState.current?.seed);
      expect(hostState.current?.round).toBe(round);
      const loser = round === 2 ? page : guest;
      const start = Date.now();
      while (hostState.current?.phase === 'playing' && Date.now() - start < 25000) {
        await loser.keyboard.press('ArrowDown'); await loser.waitForTimeout(180);
      }
      await expect.poll(() => hostState.current?.phase, { timeout: 5000 }).toMatch(/freeze|roundEnd/);
      await expect(page.locator('#roundEnd')).toBeVisible({ timeout: 5000 });
      console.log('ROUND', round, JSON.stringify(hostState.current?.players.map(p => ({ name: p.name, wins: p.wins, hearts: p.hearts }))));
    }
    await expect(page.locator('#matchEnd')).toBeVisible({ timeout: 15000 });
    await expect(guest.locator('#matchEnd')).toBeVisible();
    expect(hostState.current?.winner).toBe(hostState.id);
    expect(hostState.current?.players.find(p => p.id === hostState.id)?.wins).toBe(2);
    await page.locator('[data-room="rematch"]').click();
    await expect.poll(() => hostState.current?.phase).toBe('countdown');
    expect(hostState.current?.round).toBe(1); expect(hostState.current?.players.every(p => p.wins === 0)).toBe(true);
    await expect.poll(() => hostState.current?.phase, { timeout: 10000 }).toBe('playing');
    await page.locator('#versus [data-room="leave"]').click();
    await expect(guest.locator('#matchEnd')).toBeVisible();
    expect(guestState.current?.host).toBe(guestState.id); expect(guestState.current?.winner).toBe(guestState.id);
    await guest.locator('[data-room="lobby"]').click(); await expect(guest.locator('#lobby')).toBeVisible();
    expect(hostState.errors).toEqual([]); expect(guestState.errors).toEqual([]);
  } finally { await guestContext.close(); }
});
