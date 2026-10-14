import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.HOP_TEST_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
const output = new URL('../art/cover/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  const hostContext = await browser.newContext({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  let state, hostId, guestId; const errors = [];
  for (const [page, name, animal] of [[host, 'CORAL FOX', 2], [guest, 'MINT CAT', 5]]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('websocket', socket => socket.on('framereceived', frame => {
      try { const data = JSON.parse(String(frame.payload)); if (page === host && data.snapshot) state = data.snapshot;
        if (data.type === 'welcome') { if (page === host) hostId = data.id; else guestId = data.id; }
      } catch { /* ping/pong */ }
    }));
    await page.addInitScript(({ name, animal }) => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name, animal, sfx: 0, graphics: 'high' })), { name, animal });
  }
  const wait = async condition => { const end = Date.now() + 20000; while (!condition()) { if (Date.now() > end) throw new Error('Capture state timeout'); await host.waitForTimeout(50); } };
  await host.goto(base); await host.locator('[data-mode="play"]').click(); await host.locator('[data-room="create"]').click();
  await host.locator('#lobby-code').waitFor(); const code = await host.locator('#lobby-code').innerText();
  await guest.goto(`${base}/?room=${code}`); await guest.locator('[data-room="join"]').click();
  await guest.locator('#lobby').waitFor(); await host.locator('[data-room="start"]').click(); await wait(() => state?.phase === 'playing');
  // Drive genuine authoritative hops. Both animals stand on the final starting grass row,
  // with traffic immediately ahead; no altered geometry, fake state or compositing.
  for (let i = 0; i < 3; i++) { await host.keyboard.press('ArrowUp'); await guest.keyboard.press('ArrowUp'); await host.waitForTimeout(210); }
  await wait(() => state.players.every(p => p.movement.z === 4 && !p.movement.hopping));
  await host.keyboard.press('ArrowLeft'); await guest.keyboard.press('ArrowRight'); await host.waitForTimeout(220);
  await host.screenshot({ path: new URL('hop-brawl-1800x1200.png', output).pathname.replace(/^\/(\w:)/, '$1') });
  if (errors.length) throw new Error(errors.join('\n'));
  const report = { width: 1800, height: 1200, source: base, seed: state.seed, phase: state.phase,
    players: state.players.map(p => ({ animal: p.animal, slot: p.slot, x: p.movement.x, row: p.movement.z, hearts: p.hearts })),
    hostIdPresent: Boolean(hostId), guestIdPresent: Boolean(guestId), errors };
  await writeFile(new URL('capture.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
