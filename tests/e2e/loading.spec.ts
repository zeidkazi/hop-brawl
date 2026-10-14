import { expect, test } from '@playwright/test';

test('inline loading paints without JavaScript or external fonts', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.load-wordmark')).toBeVisible();
  await expect(page.locator('.load-gloves')).toBeVisible();
  expect(await page.locator('.load-wordmark path').count()).toBe(8);
  expect(await page.locator('#loading-style').textContent()).not.toContain('__FAST__');
  await context.close();
});

test('failed asset retry preserves successful files and the canvas', async ({ page }) => {
  const requests = new Map<string, number>(); let fail = true;
  await page.route('**/models/*.glb', async route => {
    const url = route.request().url(); requests.set(url, (requests.get(url) ?? 0) + 1);
    if (url.endsWith('/fox.glb') && fail) await route.fulfill({ status: 503, body: 'Temporary failure' });
    else await route.continue();
  });
  await page.goto('/');
  await expect(page.getByText("Couldn't load the game")).toBeVisible();
  await page.evaluate(() => { (window as unknown as { initialCanvas: Element | null }).initialCanvas = document.querySelector('canvas'); });
  fail = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
  for (const [url, count] of requests) expect(count).toBe(url.endsWith('/fox.glb') ? 2 : 1);
  expect(await page.evaluate(() => (window as unknown as { initialCanvas: Element }).initialCanvas === document.querySelector('canvas'))).toBe(true);
  const bytes = await page.locator('#loading').evaluate(element => [element.getAttribute('data-bytes'), element.getAttribute('data-total')]);
  expect(Number(bytes[0])).toBeGreaterThan(600000); expect(bytes[0]).toBe(bytes[1]);
});

test('slow transfer rotates tips, explains delay, and never moves progress backwards', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/models/fox.glb', async route => { await held; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.load-tip')).toHaveText('Last one hopping wins the round', { timeout: 6000 });
  const first = Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'));
  await expect(page.getByText('Still loading… slow connection')).toBeVisible({ timeout: 12000 });
  expect(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(first);
  release(); await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
});

test('reduce motion uses only a fade and Home is live before reveal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const states: string[] = []; (window as unknown as { loadingStates: string[] }).loadingStates = states;
    new MutationObserver(records => { for (const record of records) {
      if ((record.target as Element).id === 'loading' && record.attributeName === 'data-state') states.push((record.target as HTMLElement).dataset.state!);
    } }).observe(document, { attributes: true, subtree: true });
  });
  await page.goto('/'); await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
  const states = await page.evaluate(() => (window as unknown as { loadingStates: string[] }).loadingStates);
  expect(states).toContain('fade'); expect(states).not.toContain('punch'); expect(states).not.toContain('reveal');
  await expect(page.locator('#home')).toBeVisible();
});
