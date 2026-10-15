import { expect, test } from '@playwright/test';
import { ANIMALS, STREET } from '../../shared/config';

test('Home keeps its loaded scene through animal and name controls', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
  await page.goto('/?debug=1');
  await expect(page.locator('#home')).toBeVisible({ timeout: 30000 });
  const canvas = await page.locator('#game-canvas').elementHandle();
  const loaded = models.length;
  await expect(page.locator('#animal-label')).toHaveText('fox');
  expect(models.filter(url => url.endsWith('/logo.glb'))).toHaveLength(1);
  await expect(page.locator('.mode-buttons button')).toHaveCount(2);
  await expect(page.locator('#home .panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'MULTIPLAYER', exact: true }).click();
  await expect(page.locator('#home-name')).toBeFocused();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#name')).toBeVisible();
  await page.locator('#home-name').fill(' Hopper ');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#friends')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#name-caption')).toHaveText('Hopper');
  for (let index = 1; index <= ANIMALS.length; index++) {
    await page.getByRole('button', { name: 'Next animal', exact: true }).click();
    await expect(page.locator('#animal-label')).toHaveText(ANIMALS[(index + STREET.DEFAULT_ANIMAL) % ANIMALS.length]!);
  }
  await page.getByRole('button', { name: 'Throw boxing combo', exact: true }).click();
  await expect(page.locator('#animal-label')).toHaveText('fox');
  await page.getByRole('button', { name: 'Next animal', exact: true }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#animal-label')).toHaveText('fox');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Credits', exact: true }).click();
  await expect(page.locator('#credits')).toContainText('Lilita One');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#home')).toBeVisible();
  expect(models.length).toBe(loaded);
  expect(await canvas!.evaluate(element => element === document.querySelector('#game-canvas'))).toBe(true);
});

test('Home fills odd viewports at 100, 125, 150 and 200 percent DPR', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const mobile = testInfo.project.name === 'mobile';
  for (const dpr of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile,
      viewport: { width: 391, height: 845 } });
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/?debug=1');
      await expect.poll(() => page.evaluate(() => !!window.__HOP_DEBUG__)).toBe(true);
      for (const viewport of [{ width: 391, height: 845 }, { width: 1441, height: 901 }, { width: 845, height: 391 }]) {
        await page.setViewportSize(viewport);
        await expect.poll(() => page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
          const ratio = window.__HOP_DEBUG__!.snapshot().pixelRatio;
          return canvas.width === Math.ceil(innerWidth * ratio) && canvas.height === Math.ceil(innerHeight * ratio);
        })).toBe(true);
        const bounds = await page.locator('#game-canvas').boundingBox();
        expect(bounds).toEqual({ x: 0, y: 0, ...viewport });
        expect(await page.evaluate(() => window.__HOP_DEBUG__!.snapshot().resolution)).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const actions = await page.locator('.mode-buttons').boundingBox();
        expect(actions!.x).toBeGreaterThanOrEqual(0);
        expect(actions!.y + actions!.height).toBeLessThanOrEqual(viewport.height);
      }
      if (dpr === 1.25 && process.env.HOP_CAPTURE_REVIEW) await page.screenshot({ path: testInfo.outputPath('home-dpr125-landscape.png') });
    } finally { await context.close(); }
  }
});

test('carousel follows arrows and finger direction; crowd cheers without replacing the scene', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => !!window.__HOP_DEBUG__)).toBe(true);
  for (const [label, outgoing, incoming] of [['Next animal', -1, 1], ['Previous animal', 1, -1]] as const) {
    const samples = await page.evaluate(async label => {
      document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
      const values: { animal: string; offset: number }[] = [];
      const start = performance.now();
      while (performance.now() - start < 350) {
        const snap = window.__HOP_DEBUG__!.snapshot(); values.push({ animal: snap.animal, offset: snap.animalOffset });
        await new Promise(requestAnimationFrame);
      }
      return values;
    }, label);
    const first = samples[0]!.animal;
    expect(samples.some(sample => sample.animal === first && sample.offset * outgoing > 0.1)).toBe(true);
    expect(samples.some(sample => sample.animal !== first && sample.offset * incoming > 0.1)).toBe(true);
    expect(Math.abs(samples.at(-1)!.offset)).toBeLessThan(0.01);
  }
  const hit = page.getByRole('button', { name: 'Throw boxing combo', exact: true });
  await hit.dispatchEvent('pointerdown', { clientX: 200 });
  await hit.dispatchEvent('pointerup', { clientX: 150 });
  await expect(page.locator('#animal-label')).toHaveText('penguin');
  await hit.dispatchEvent('pointerdown', { clientX: 150 });
  await hit.dispatchEvent('pointerup', { clientX: 200 });
  await expect(page.locator('#animal-label')).toHaveText('fox');
  await page.evaluate(() => { window.__HOP_DEBUG__!.cheer(); window.__HOP_DEBUG__!.punch(); });
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.snapshot().crowdCheering)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.snapshot().crowdCheering)).toBe(false);
  await expect(page.locator('#game-canvas')).toHaveCount(1);
});


test('Home has two modes with Enter and S shortcuts and softer default music', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Shortcuts' })));
  await page.goto('/?debug=1'); await expect(page.locator('#ui-root')).not.toHaveAttribute('inert', '', { timeout: 30000 });
  await expect(page.locator('.mode-buttons button')).toHaveText(['MULTIPLAYER', 'SOLO']);
  await page.getByRole('button', { name: 'Edit name', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.locator('#friends')).toBeVisible();
  await expect(page.locator('#name')).toBeHidden();
  await page.keyboard.press('Escape'); await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#music')).toHaveValue('0.35');
  await page.keyboard.press('Escape'); await expect(page.locator('#home')).toBeVisible();
  await page.keyboard.press('s'); await expect(page.locator('#solo')).toBeVisible();
});
