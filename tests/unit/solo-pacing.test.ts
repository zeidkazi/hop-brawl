import { expect, it } from 'vitest';
import { SoloPacing } from '../../client/src/game/solo-pacing';
it('waits for the first hop, follows progress and only warns at seven idle seconds', () => {
  const pacing = new SoloPacing(); pacing.update(100, 1, null); expect(pacing.camZ).toBe(0); expect(pacing.warning).toBe(false);
  pacing.update(101, 2, 100); expect(pacing.camZ).toBe(1);
  pacing.update(107.999, 2, 100); expect(pacing.warning).toBe(false);
  pacing.update(108, 2, 100); expect(pacing.warning).toBe(true); expect(pacing.expired).toBe(false);
  expect(pacing.camZ).toBeCloseTo(2.05); pacing.update(110, 2, 100); expect(pacing.expired).toBe(true);
});
it('retreat and sideways movement do not evade the penalty; forward progress resets it', () => {
  const pacing = new SoloPacing(); pacing.update(0, 5, 0); pacing.update(7, 4, 0); expect(pacing.warning).toBe(true);
  pacing.update(8, 6, 0); expect(pacing.warning).toBe(false); pacing.update(17, 5, 0); expect(pacing.expired).toBe(true);
  pacing.reset(); expect(pacing.expired).toBe(false); expect(pacing.camZ).toBe(0);
});
