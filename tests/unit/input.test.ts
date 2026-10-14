import { expect, it } from 'vitest';
import { swipeDirection } from '../../client/src/game/input';
it('decides touch direction exactly at 24 pixels using the dominant axis', () => {
  expect(swipeDirection(23, 23)).toBeNull();
  expect(swipeDirection(24, 3)).toBe('right');
  expect(swipeDirection(-24, 3)).toBe('left');
  expect(swipeDirection(2, -24)).toBe('up');
  expect(swipeDirection(2, 24)).toBe('down');
});
