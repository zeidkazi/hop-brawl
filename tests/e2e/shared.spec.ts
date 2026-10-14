import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { laneItemX, slowMoWindow, trainWarning, trainX } from '../../shared/hazards';
import { generateRow } from '../../shared/worldgen';

test('loads locally and reproduces Node world/hazard results in independent browser contexts', async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Hop Brawl — Cross the road. Shove your friends.');
  await expect(page.locator('#ui-root')).toHaveText('Loading…');
  await page.screenshot({ path: testInfo.outputPath('m1-loading-shell.png'), fullPage: true });

  const rows = Array.from({ length: 300 }, (_, z) => generateRow(20261030, z));
  const windows = [slowMoWindow(4), slowMoWindow(2)];
  const t = 30.125;
  const expected = rows.map(row => ({
    row,
    positions: row.kind === 'road' ? row.vehicles.map(item => laneItemX(row, item, t, windows))
      : row.kind === 'river' ? row.logs.map(item => laneItemX(row, item, t, windows))
        : row.kind === 'rail' ? [trainX(row, t, windows), trainWarning(row, t, windows)] : [],
  }));
  const worldgenUrl = '/@fs/' + fileURLToPath(new URL('../../shared/worldgen.ts', import.meta.url)).replaceAll('\\', '/');
  const hazardsUrl = '/@fs/' + fileURLToPath(new URL('../../shared/hazards.ts', import.meta.url)).replaceAll('\\', '/');
  const otherContext = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto('/');
    for (const target of [page, otherPage]) {
      const actual = await target.evaluate(async ({ worldgenUrl, hazardsUrl, t }) => {
        const world = await import(/* @vite-ignore */ worldgenUrl) as typeof import('../../shared/worldgen');
        const hazards = await import(/* @vite-ignore */ hazardsUrl) as typeof import('../../shared/hazards');
        const windows = [hazards.slowMoWindow(4), hazards.slowMoWindow(2)];
        return Array.from({ length: 300 }, (_, z) => {
          const row = world.generateRow(20261030, z);
          return {
            row,
            positions: row.kind === 'road' ? row.vehicles.map(item => hazards.laneItemX(row, item, t, windows))
              : row.kind === 'river' ? row.logs.map(item => hazards.laneItemX(row, item, t, windows))
                : row.kind === 'rail' ? [hazards.trainX(row, t, windows), hazards.trainWarning(row, t, windows)] : [],
          };
        });
      }, { worldgenUrl, hazardsUrl, t });
      expect(actual).toEqual(expected);
    }
  } finally {
    await otherContext.close();
  }
  expect(errors).toEqual([]);
});
