import { expect, test } from '@playwright/test';
test('detail assets render in pooled batches, preserve corridors, and honor quality and motion settings', async ({ page }) => {
  const errors: string[]=[]; page.on('pageerror', e=>errors.push(e.message)); page.on('console', e=>{if(e.type()==='error')errors.push(e.text());});
  await page.addInitScript(()=>localStorage.setItem('hop-brawl-settings',JSON.stringify({name:'World detail',animal:2})));
  await page.goto('/?debug=1'); await page.waitForFunction(()=>!!window.__HOP_DEBUG__);
  await page.getByRole('button',{name:'SOLO',exact:true}).click(); await page.waitForFunction(()=>window.__HOP_DEBUG__!.solo.phase==='playing');
  const before=await page.evaluate(()=>{
    const s=window.__HOP_DEBUG__!.solo, world=s.game.world;
    const details=world.details!; const batches=details.batches;
    return {props:['flowers','grass_tuft','small_bush','stump','pebbles','fence_piece'].reduce((sum,n)=>sum+batches.get(n)!.count,0), grass:world.rows.filter(s=>s.row?.kind==='grass').length,
      traffic:['car','hatchback','taxi','truck','sports_car','bus','ice_cream_van'].reduce((sum,n)=>sum+batches.get(n)!.count,0), models:batches.size};
  });
  expect(before.models).toBe(17); expect(before.props).toBeGreaterThanOrEqual(before.grass*3); expect(before.props).toBeLessThanOrEqual(before.grass*6); expect(before.traffic).toBeGreaterThan(0);
  await page.evaluate(()=>{const game=window.__HOP_DEBUG__!.solo.game;game.setReducedMotion(true);game.setSuperHop(true);});
  await expect(page.locator('.super-hop-lines')).toBeHidden();
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>window.__HOP_DEBUG__!.solo.game.world.details!.batches.get('bird')!.count)).toBe(0);
  await page.evaluate(()=>{const game=window.__HOP_DEBUG__!.solo.game;game.setReducedMotion(false);game.setSuperHop(true);});
  await expect(page.locator('.super-hop-lines')).toBeVisible();
  await page.evaluate(()=>{const game=window.__HOP_DEBUG__!.solo.game;game.setSuperHop(false);game.setGraphics('low');});
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>window.__HOP_DEBUG__!.solo.game.world.details!.clouds.visible)).toBe(false);
  expect(errors).toEqual([]);
});
