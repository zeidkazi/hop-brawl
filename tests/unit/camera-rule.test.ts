import { expect, it } from 'vitest';
import { advanceCamera, bottomAt, CameraSpring, impactElapsed, initialCamZ, soloDrift, warningLevel } from '../../shared/camera';
it('advances a continuous edge without retreat or exceeding the scroll speed cap', () => {
  expect(advanceCamera(2, 9.4, .12, .1)).toBeCloseTo(2.4);
  expect(advanceCamera(2, 30, .12, .1)).toBeCloseTo(2.6);
  expect(advanceCamera(2, 0, 0, .1)).toBe(2);
  expect(soloDrift(0)).toBe(.12); expect(soloDrift(120)).toBe(.6);
});
it('eases velocity from rest with a critically damped response at both frame rates', () => {
  const end = [30, 60].map(fps => { const s = new CameraSpring(); let previous = 0;
    for (let frame = 0; frame < fps; frame++) { const next = s.update(1, 1 / fps); expect(next).toBeGreaterThanOrEqual(previous); previous = next; }
    return s.value;
  });
  expect(end[0]).toBeCloseTo(end[1]!, 12);
  const spring = new CameraSpring(); expect(spring.update(1, 1 / 60)).toBeLessThan(.01);
});
it('uses the same angled ground edge in every viewport and fades danger by distance', () => {
  for (const aspect of [390 / 844, 1440 / 900]) expect(bottomAt(initialCamZ(aspect), 4, aspect)).toBe(initialCamZ(aspect));
  expect(warningLevel(2.6)).toBe(0); expect(warningLevel(2.5)).toBe(.15); expect(warningLevel(.3)).toBe(.55);
});
it('slows only the impact animation clock for 70ms, retaining all subsequent time', () => {
  expect(impactElapsed(.07)).toBeCloseTo(.007); expect(impactElapsed(.1)).toBeCloseTo(.037);
  expect(impactElapsed(.1, true)).toBe(.1);
});

it('never consumes a Left Behind life before 0.8 seconds of danger, including retreat across the edge', async () => {
  const { Movement } = await import('../../shared/movement');
  const move = new Movement(z => ({ kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null }));
  move.externalCamera = true; move.camZ = 2;
  move.advance(.799); expect(move.dead).toBeNull();
  const restore = new Movement(move.rowAt); restore.restore(move.save());
  restore.advance(.81); expect(restore.dead).toBe('LEFT BEHIND!'); expect(restore.dangerSeconds).toBeGreaterThanOrEqual(.8);
  restore.reset(); expect(restore.dangerSeconds).toBe(0);
});
