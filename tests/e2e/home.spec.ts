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
  await expect(page.locator('.mode-buttons button')).toHaveCount(3);
  await expect(page.locator('#home .panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'FRIENDS', exact: true }).click();
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
  await page.getByRole('button', { name: 'Change animal', exact: true }).click();
  await expect(page.locator('#animal-label')).toHaveText('penguin');
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
      if (dpr === 1.25) await page.screenshot({ path: testInfo.outputPath('home-dpr125-landscape.png') });
    } finally { await context.close(); }
  }
});
