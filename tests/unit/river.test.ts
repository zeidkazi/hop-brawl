import { describe, expect, it } from 'vitest';
import { WORLD } from '../../shared/config';
import { generateRiverRow, rowKind } from '../../shared/worldgen';

describe('river log schedules', () => {
  it('provides an arrival every 2.5 seconds across the complete ring', () => {
    const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
    const seenLengths = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      for (const z of [5, 14, 15, 40, 80, 120, 150, 5000]) {
        const row = generateRiverRow(seed, z);
        expect(row).toEqual(generateRiverRow(seed, z));
        const gain = 1 + 0.5 * Math.min(1, z / 150);
        expect(row.speed).toBeGreaterThanOrEqual(gain);
        expect(row.speed).toBeLessThanOrEqual(2.2 * gain);
        for (let i = 0; i < row.logs.length; i++) {
          const log = row.logs[i]!;
          const next = row.logs[(i + 1) % row.logs.length]!;
          seenLengths.add(log.length);
          const pitch = next.offset + (i === row.logs.length - 1 ? span : 0) - log.offset;
          const gap = pitch - (log.length + next.length) / 2;
          expect(gap).toBeGreaterThanOrEqual(1.5 - 1e-10);
          expect(gap).toBeLessThanOrEqual(3 + 1e-10);
          expect(pitch / row.speed).toBeLessThanOrEqual(2.5 + 1e-10);
        }
      }
    }
    expect([...seenLengths].sort()).toEqual([2, 3, 4]);
  });

  it('alternates adjacent river directions and never gives them equal speeds', () => {
    let pairs = 0;
    for (let seed = 0; seed < 100; seed++) {
      for (let z = 6; z < 300; z++) {
        if (rowKind(seed, z) !== 'river' || rowKind(seed, z - 1) !== 'river') continue;
        const previous = generateRiverRow(seed, z - 1);
        const current = generateRiverRow(seed, z);
        expect(current.direction).toBe(-previous.direction);
        expect(current.speed).not.toBe(previous.speed);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThan(0);
  });
});
