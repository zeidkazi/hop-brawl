import { chromium, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { RoomSnapshot } from '../../shared/room';

const base = process.env.HOP_TEST_URL ?? 'http://127.0.0.1:5173';
function observe(page: Page) {
  const state = { current: null as RoomSnapshot | null, id: '', errors: [] as string[] };
  page.on('pageerror', e => { state.errors.push(e.message); console.error('PAGE ERROR', e.stack); });
  page.on('websocket', ws => ws.on('framereceived', frame => {
    try {
      const m = JSON.parse(String(frame.payload)) as { snapshot?: RoomSnapshot; id?: string };
      if (m.snapshot) { if (state.current?.phase !== m.snapshot.phase) console.log('QUICK', m.snapshot.phase, m.snapshot.round); state.current = m.snapshot; }
      if (m.id) state.id = m.id;
    } catch { /* Hibernation ping/pong. */ }
  }));
  return state;
}
async function open(page: Page, name: string, animal: number) {
  await page.addInitScript(({ name, animal }) => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name, animal, sfx: 0, music: 0, reducedMotion: true })), { name, animal });
  await page.goto(base); await expect(page.locator('#ui-root')).not.toHaveAttribute('inert', '', { timeout: 30000 });
  await page.locator('[data-mode=play]').click();
}
test('Quick Match: two windows play best-of-three, mutual rematch, then find a new opponent', async ({ browser, page: fixture }) => {
  test.setTimeout(180000);
  const normal = process.env.HOP_PERSISTENT_REVIEW ? await chromium.launchPersistentContext('tmp/quick-review-profile', { viewport: { width: 1440, height: 900 }, args: ['--enable-gpu', '--use-angle=d3d11'] }) : null;
  const page = normal?.pages()[0] ?? fixture;
  const context = await (normal?.browser() ?? browser).newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await context.newPage(), a = observe(page), b = observe(guest);
  try {
    await open(page, 'Coral', 2); await open(guest, 'Blue', 4);
    await page.locator('[data-quick=start]').click(); await expect(page.locator('#search')).toBeVisible();
    await expect(page.locator('#search-count')).toHaveText('1 searching');
    await guest.locator('[data-quick=start]').click();
    for (let round = 1; round <= 3; round++) {
      await expect.poll(() => a.current?.phase, { timeout: 15000 }).toBe('playing');
      expect(a.current?.quick).toBe(true); expect(a.current?.host).toBe(''); expect(a.current?.round).toBe(round);
      expect(b.current?.seed).toBe(a.current?.seed); await expect(page.locator('[data-room=start]')).toBeHidden();
      expect(new URL(page.url()).searchParams.has('room')).toBe(false);
      const loser = round === 2 ? page : guest, start = Date.now();
      while (a.current?.phase === 'playing' && Date.now() - start < 25000) {
        if (loser === guest) { await guest.mouse.move(195, 650); await guest.mouse.down(); await guest.mouse.move(195, 710, { steps: 2 }); await guest.mouse.up(); }
        else await page.keyboard.press('ArrowDown');
        await loser.waitForTimeout(180);
      }
      await expect(page.locator('#roundEnd')).toBeVisible({ timeout: 5000 });
    }
    await expect(page.locator('#matchEnd')).toBeVisible({ timeout: 10000 });
    expect(a.current?.players.find(p => p.id === a.id)?.wins).toBe(2);
    await expect(guest.locator('[data-room=rematch]')).toBeVisible(); await expect(page.locator('[data-room=lobby]')).toBeHidden();
    await page.locator('[data-room=rematch]').click();
    await expect(guest.locator('#match-host-note')).toContainText('Opponent wants a rematch!');
    expect(a.current?.phase).toBe('matchEnd'); await guest.locator('[data-room=rematch]').click();
    await expect.poll(() => a.current?.phase).toBe('countdown'); expect(a.current?.players.every(p => p.wins === 0)).toBe(true);
    const oldCode = a.current?.code;
    await expect.poll(() => a.current?.phase, { timeout: 10000 }).toBe('playing');
    await guest.locator('#versus [data-room=leave]').click(); await expect(page.locator('#matchEnd')).toBeVisible();
    await page.locator('[data-quick=new]').click(); await expect(page.locator('#search-count')).toHaveText('1 searching');
    await guest.locator('[data-mode=play]').click(); await guest.locator('[data-quick=start]').click();
    await expect.poll(() => a.current?.phase, { timeout: 10000 }).toBe('playing');
    expect(a.current?.code).not.toBe(oldCode); expect(a.current?.code).toBe(b.current?.code);
    await guest.locator('#versus [data-room=leave]').click(); await expect(page.locator('#matchEnd')).toBeVisible();
    await page.locator('[data-quick=menu]').click(); await expect(page.locator('#home')).toBeVisible();
    expect(a.errors).toEqual([]); expect(b.errors).toEqual([]);
  } finally { await context.close(); await normal?.close(); }
});

test('failed opponent connection returns the visible search with one retry toast', async ({ page }) => {
  test.setTimeout(30000);
  await open(page, 'Survivor', 2); await page.locator('[data-quick=start]').click();
  await expect(page.locator('#search-count')).toHaveText('1 searching');
  await page.evaluate(() => {
    const url = new URL('/ws/quick?name=NoConnect&animal=4', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(url);
    ws.onmessage = e => { if (String(e.data).includes('"type":"error"')) ws.close(); };
  });
  await expect(page.locator('#search-count')).toHaveText('Opponent found! Connecting…');
  await expect(page.locator('.toast:visible')).toHaveText("Opponent didn't connect — still searching", { timeout: 15000 });
  await expect(page.locator('#search-count')).toHaveText('1 searching');
  await page.locator('[data-quick=cancel]').click(); await expect(page.locator('#friends')).toBeVisible();
});

test('search cancel removes the player and returns to the multiplayer sheet', async ({ page }) => {
  await open(page, 'Cancel', 2); await page.locator('[data-quick=start]').click();
  await expect(page.locator('#search-count')).toHaveText('1 searching');
  await expect(page.locator('#search-time')).not.toHaveText('00:00');
  await page.locator('[data-quick=cancel]').click(); await expect(page.locator('#friends')).toBeVisible();
  await page.locator('[data-quick=start]').click(); await expect(page.locator('#search-count')).toHaveText('1 searching');
  await page.locator('[data-quick=cancel]').click();
});

test('sixty-second search prompt repeats after Keep searching, then offers a private invitation', async ({ page }) => {
  test.setTimeout(155000);
  await open(page, 'Invite', 2); await page.locator('[data-quick=start]').click();
  await expect(page.locator('#search-empty')).toBeVisible({ timeout: 65000 });
  await expect(page.locator('#search-time')).toHaveText(/^01:0[0-5]$/);
  await page.locator('[data-quick=keep]').click(); await expect(page.locator('#search-empty')).toBeHidden();
  await expect(page.locator('#search-empty')).toBeVisible({ timeout: 65000 });
  await page.locator('[data-quick=invite]').click(); await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.locator('#lobby-code')).toHaveText(/^[A-Z]{4}$/); await expect(page.locator('[data-room=start]')).toBeDisabled();
});

test('sixty-second search prompt can cancel matchmaking and start Solo', async ({ page }) => {
  test.setTimeout(85000);
  await open(page, 'Solo', 2); await page.locator('[data-quick=start]').click();
  await expect(page.locator('#search-empty')).toBeVisible({ timeout: 65000 });
  await page.locator('[data-quick=solo]').click(); await expect(page.locator('#solo')).toBeVisible();
  await expect(page.locator('#search')).toBeHidden();
});
