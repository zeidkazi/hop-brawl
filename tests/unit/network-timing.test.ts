import { expect, it } from 'vitest';
import { NetworkTiming } from '../../client/src/game/network-timing';
it('tracks packet arrival jitter, clamps adaptive delay and recovers on stable delivery', () => {
  const timing = new NetworkTiming();
  timing.sample(1000, 5000); timing.sample(1050, 5050); expect(timing.delay).toBe(90);
  for (let i = 1; i <= 10; i++) timing.sample(1050 + i * 250, 5050 + i * 50);
  expect(timing.delay).toBe(220);
  for (let i = 1; i <= 100; i++) timing.sample(3550 + i * 50, 5550 + i * 50);
  expect(timing.delay).toBe(90);
  timing.jitter = 30; expect(timing.delay).toBe(120);
  timing.reset(); expect(timing.delay).toBe(90);
});
