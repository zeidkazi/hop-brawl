import { test, expect } from '@playwright/test';

test('ship-today frustum is populated at rows 5, 35, 70 and 150 without sky gaps', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Coverage', animal: 2, sfx: 0 })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  const results = await page.evaluate(async () => {
    const game = window.__HOP_DEBUG__!.solo.game;
    game.beforeFrame = null; game.go('gameplay'); game.home.root.visible = false;
    const result = [];
    for (const row of [5, 35, 70, 150]) {
      game.rig.targetCamZ = Math.max(0, row - 7); game.rig.leaderZ = row; game.rig.update(1, 0);
      game.world.setView(game.rig.camera); game.world.requestWindow(game.rig.camZ); game.world.prepareWindow(game.rig.camZ);
      const camera = game.rig.camera, near = camera.position.clone(), ray = near.clone();
      let minimum = Infinity, maximum = -Infinity, missing = 0;
      for (let x = -1; x <= 1; x += .25) for (let y = -1; y <= 1; y += .25) {
        near.set(x, y, -1).unproject(camera); ray.set(x, y, 1).unproject(camera).sub(near);
        const z = -(near.z + ray.z * (-near.y / ray.y)); minimum = Math.min(minimum, z); maximum = Math.max(maximum, z);
        if (!game.world.rows.some(slot => slot.z === Math.round(z) && !!slot.row)) missing++;
      }
      const left = near.set(-.5, 0, -row).project(camera).x;
      const width = (near.set(8.5, 0, -row).project(camera).x - left) / 2;
      const pixels = await new Promise<number>(resolve => {
        const previous = game.onFrame;
        game.onFrame = now => {
          const canvas = document.createElement('canvas'); canvas.width = game.canvas.width; canvas.height = game.canvas.height;
          const context = canvas.getContext('2d')!; context.drawImage(game.canvas, 0, 0);
          let sky = 0;
          for (let y = .1; y < 1; y += .1) for (let x = .1; x < 1; x += .1) {
            const pixel = context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data;
            // Sky is blue/warm cream; actual rendered terrain has neither sky range.
            if ((pixel[2]! > 220 && pixel[1]! > 175 && pixel[0]! < 180) || (pixel[0]! > 245 && pixel[1]! > 220 && pixel[2]! > 180)) sky++;
          }
          game.onFrame = previous; previous?.(now); resolve(sky);
        };
      });
      result.push({ row, minimum, maximum, missing, width, ahead: maximum - row, y: game.rig.screenY(4, row), skyPixels: pixels });
    }
    return result;
  });
  for (const result of results) {
    expect(result.missing).toBe(0); expect(result.ahead).toBeGreaterThanOrEqual(7);
    expect(result.width).toBeGreaterThanOrEqual(page.viewportSize()!.width < 500 ? .88 : .45);
    expect(result.y).toBeCloseTo(.65, 1);
    expect(result.skyPixels).toBeLessThan(10); // Allow cream vehicle details, never a blank sky region.
  }
  console.log(JSON.stringify(results));
});
