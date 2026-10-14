import { expect, it } from 'vitest';
import { segmentAt, tierAt } from '../../shared/segments';
it('plans bounded deterministic chapters separated by exact three-row rest stops', () => {
  for (let seed = 0; seed < 1000; seed++) {
    let previous = segmentAt(seed, 0);
    for (let z = 0; z < 300; z++) {
      const segment = segmentAt(seed, z);
      expect(segment).toBeDefined();
      if (segment.start === z && z) expect(previous.kind === 'grass' || segment.kind === 'grass').toBe(true);
      if (segment.rest) expect(segment.end - segment.start).toBe(3);
      if (segment.kind === 'rail') expect(z).toBeGreaterThanOrEqual(30);
      previous = segment;
    }
    expect(segmentAt(seed, 5).end).toBe(6);
    expect(segmentAt(seed, 30).kind).toBe('rail');
  }
  const distant = segmentAt(42, 0x100000001); segmentAt(1, 6);
  expect(segmentAt(42, 0x100000001)).toEqual(distant);
  expect(tierAt(119).start).toBe(60); expect(tierAt(120).start).toBe(120);
}, 30000);
