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
  for (const [page, name, animal] of [[host, 'CORAL FOX', 2], [guest, 'BLUE CAT', 5]]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('websocket', socket => socket.on('framereceived', frame => {
      try { const data = JSON.parse(String(frame.payload)); if (page === host && data.snapshot) state = data.snapshot;
        if (data.type === 'welcome') { if (page === host) hostId = data.id; else guestId = data.id; }
      } catch { /* ping/pong */ }
    }));
    await page.addInitScript(({ name, animal }) => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name, animal, sfx: 0, graphics: 'high' })), { name, animal });
  }
  const wait = async condition => { const end = Date.now() + 20000; while (!condition()) { if (Date.now() > end) throw new Error('Capture state timeout'); await host.waitForTimeout(50); } };
  await host.goto(`${base}/?debug=1`); await host.waitForFunction(() => !!window.__HOP_DEBUG__); await host.locator('[data-mode="play"]').click(); await host.locator('[data-room="create"]').click();
  await host.locator('#lobby-code').waitFor(); const code = await host.locator('#lobby-code').innerText();
  await guest.goto(`${base}/?room=${code}&debug=1`); await guest.locator('[data-room="join"]').click();
  await guest.locator('#lobby').waitFor(); await host.locator('[data-room="start"]').click(); await wait(() => state?.phase === 'playing');
  // Capture an actual server-confirmed shove, freezing the rendered contact frame only.
  // The sole presentation changes are hiding UI and placing the existing 3D logo in a corner.
  await host.waitForFunction(() => window.__HOP_DEBUG__?.versus.input.enabled);
  await guest.waitForFunction(() => window.__HOP_DEBUG__?.versus.input.enabled);
  for (let i = 0; i < 2; i++) { await host.keyboard.press('ArrowUp'); await guest.keyboard.press('ArrowUp'); await wait(() => state.players.every(p => p.movement.z === i + 2 && !p.movement.hopping)); }
  await wait(() => state.players.every(p => p.movement.z === 3 && !p.movement.hopping));
  await host.keyboard.press('ArrowRight'); await host.waitForTimeout(220);
  await host.evaluate(() => {
    const api = window.__HOP_DEBUG__, game = api.solo.game, camera = game.rig.camera;
    game.home.finishIntro();
    const logo = game.home.logo.clone(true); logo.name = 'cover-logo'; logo.visible = true;
    logo.position.set(0, 0, 0); logo.quaternion.copy(camera.quaternion);
    const distance = 10, halfHeight = Math.tan(camera.fov * Math.PI / 360) * distance;
    logo.scale.setScalar(halfHeight * 2 * camera.aspect * .28 / game.home.logoWidth);
    logo.position.copy(camera.position.clone().set(-.64, .53, .5).unproject(camera).sub(camera.position).normalize().multiplyScalar(distance).add(camera.position));
    logo.traverse(node => { if (node.isMesh) { node.material = node.material.clone(); node.material.depthTest = true; node.material.depthWrite = true; node.renderOrder = 1000; } });
    game.scene.add(logo);
    for (const element of document.body.children) if (element.id !== 'game-canvas' && element instanceof HTMLElement) element.style.visibility = 'hidden';
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    game.onFrame = () => {
      const versus = api.versus, actor = versus.actors.get(versus.client.id);
      if (actor?.boxer.move !== 'punch' || !actor.effects.root.children.some(star => star.visible)) return;
      const event = versus.client.state.events.findLast(e => e.kind === 'shove' && e.by === versus.client.id);
      if (!event) return;
      cancelAnimationFrame(game.frameId);
      window.__COVER_CAPTURE__ = { snapshot: versus.client.state, event, impactVisible: true, hudVisible: false, logoVisible: true };
    };
  });
  await host.keyboard.press('ArrowRight');
  await host.waitForFunction(() => !!window.__COVER_CAPTURE__, null, { timeout: 10000 });
  const captured = await host.evaluate(() => window.__COVER_CAPTURE__); state = captured.snapshot;
  await host.screenshot({ path: new URL('hop-brawl-1800x1200.png', output).pathname.replace(/^\/(\w:)/, '$1') });
  if (errors.length) throw new Error(errors.join('\n'));
  const report = { width: 1800, height: 1200, source: base, seed: state.seed, phase: state.phase,
    players: state.players.map(p => ({ animal: p.animal, slot: p.slot, x: p.movement.x, row: p.movement.z, hearts: p.hearts })),
    hostIdPresent: Boolean(hostId), guestIdPresent: Boolean(guestId), impactVisible: captured.impactVisible, hudVisible: captured.hudVisible, logoVisible: captured.logoVisible, shove: { direction: captured.event.direction, confirmed: true }, errors };
  await writeFile(new URL('capture.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
