import { expect, it } from 'vitest';
import { loadingExit } from '../../client/src/ui/loading';

it('uses the specified cached threshold and always prioritizes Reduce Motion', () => {
  expect(loadingExit(399, false)).toBe('split');
  expect(loadingExit(400, false)).toBe('punch');
  expect(loadingExit(8000, false)).toBe('punch');
  expect(loadingExit(100, true)).toBe('fade');
  expect(loadingExit(8000, true)).toBe('fade');
});
