import { describe, expect, it } from 'vitest';
import { hash32, mulberry32, randomInt } from '../../shared/rng';

describe('mulberry32', () => {
  it('matches the reference sequence for seed 1', () => {
    const random = mulberry32(1);
    expect(Array.from({ length: 5 }, () => random())).toEqual([
      0.6270739405881613,
      0.002735721180215478,
      0.5274470399599522,
      0.9810509674716741,
      0.9683778982143849,
    ]);
  });

  it('replays independently and always returns values in [0, 1)', () => {
    for (const seed of [0, 1, -1, 0xffffffff, 20261030]) {
      const a = mulberry32(seed);
      const b = mulberry32(seed);
      for (let i = 0; i < 1000; i++) {
        const value = a();
        expect(value).toBe(b());
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });

  it('supports both inclusive integer endpoints', () => {
    expect(randomInt(() => 0, 2, 4)).toBe(2);
    expect(randomInt(() => 1 - Number.EPSILON, 2, 4)).toBe(4);
  });
});

describe('row seed hashing', () => {
  it('is order independent and includes the high word of long-run row indices', () => {
    const expected = hash32(20261030, 43);
    hash32(0, 9);
    hash32(20261030, 8);
    expect(hash32(20261030, 43)).toBe(expected);
    expect(hash32(20261030, 43 + 0x100000000)).not.toBe(expected);
    expect(hash32(20261031, 43)).not.toBe(expected);
    expect(hash32(20261030, 44)).not.toBe(expected);
  });
});
