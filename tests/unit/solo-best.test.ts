import { expect, it } from 'vitest';
import { readBest } from '../../client/src/game/solo';
it('keeps Solo usable with missing, corrupt or denied best-score storage', () => {
  expect(readBest({ getItem: () => null })).toBeNull();
  expect(readBest({ getItem: () => { throw new Error('denied'); } })).toBeNull();
  for (const value of ['', '-1', 'NaN', '1.5', '{}']) expect(readBest({ getItem: () => value })).toBeNull();
  expect(readBest({ getItem: () => '0' })).toBe(0); expect(readBest({ getItem: () => '137' })).toBe(137);
});
