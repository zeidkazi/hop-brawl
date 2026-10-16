import { expect, it } from 'vitest';
import { advanceCamera, soloDrift } from '../../shared/camera';
it('has no idle deadline; pressure grows from elapsed round time, not last progress', () => {
  let edge = -3;
  for (let frame = 0; frame < 60 * 10; frame++) edge = advanceCamera(edge, 2, soloDrift(frame / 60), 1 / 60);
  expect(edge).toBeCloseTo(-1.6, 2);
  expect(advanceCamera(edge, 1, soloDrift(10), 1 / 60)).toBeGreaterThan(edge);
});
