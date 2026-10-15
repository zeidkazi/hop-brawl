import { expect, it } from 'vitest';
import { DeathEffects } from '../../client/src/game/death-effects';
it('arcs ten bright voxel droplets to .6 tiles, expands a 600ms ripple and releases two delayed bubbles', () => {
  const fx = new DeathEffects(); fx.update('SPLASH!', .25, 4, 8);
  const drops = fx.root.children.filter(m => m.name.startsWith('droplet'));
  expect(drops).toHaveLength(10); expect(drops.every(m => m.visible)).toBe(true);
  expect(Math.max(...drops.map(m => m.position.y))).toBeCloseTo(.612);
  const ring = fx.root.getObjectByName('ripple')!; const before = ring.scale.x;
  fx.update('SPLASH!', .5, 4, 8); expect(ring.scale.x).toBeGreaterThan(before);
  fx.update('SPLASH!', .6, 4, 8); expect(ring.visible).toBe(false); expect(fx.root.getObjectByName('bubble-0')!.visible).toBe(true);
  fx.update('SPLASH!', .72, 4, 8); expect(fx.root.getObjectByName('bubble-1')!.visible).toBe(true);
  fx.update(null, 0, 4, 8); expect(fx.root.visible).toBe(false); fx.dispose();
});
