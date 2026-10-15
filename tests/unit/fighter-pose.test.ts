import { expect, it } from 'vitest';
import { createDeathPose, deathPose, Facing, respawnHeight } from '../../client/src/game/fighter-pose';
it('turns through the short angle in exactly 80ms independent of frame rate', () => {
  for (const hz of [30, 60, 120]) {
    const facing = new Facing(); facing.update(Math.PI / 2, 0);
    for (let t = 0; t < .08; t += 1 / hz) facing.update(Math.PI / 2, t);
    expect(facing.update(Math.PI / 2, .08)).toBeCloseTo(Math.PI / 2);
  }
});
it('gives each death its own animation and disables spinning under Reduce Motion', () => {
  const p = createDeathPose();
  deathPose('FLATTENED!', .5, 1, false, p); expect(p.sy).toBeCloseTo(.1); expect(p.sx).toBeGreaterThan(1);
  deathPose('SPLASH!', .5, 1, false, p); expect(p.y).toBeLessThan(0); expect(p.sy).toBeGreaterThan(.1);
  deathPose('DERAILED!', .5, 1, false, p); expect(p.x).toBeGreaterThan(3); expect(p.roll).not.toBe(0);
  deathPose('DERAILED!', .5, 1, true, p); expect(p.roll).toBe(0);
  deathPose('SWEPT AWAY!', .5, -1, false, p); expect(p.x).toBeLessThan(0);
  deathPose('LEFT BEHIND!', 1, 1, false, p); expect(p.opacity).toBe(0);
});
it('drops, contacts, bounces and settles, with no drop under Reduce Motion', () => {
  expect(respawnHeight(0, false)).toBe(3);
  expect(respawnHeight(.45 * .65, false)).toBeCloseTo(0);
  expect(respawnHeight(.36, false)).toBeGreaterThan(0);
  expect(respawnHeight(.45, false)).toBe(0); expect(respawnHeight(.1, true)).toBe(0);
});
