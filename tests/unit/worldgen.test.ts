import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../shared/config';
import { biomeAtRow, difficultyAtRow, generateGrassRow, rowKind } from '../../shared/worldgen';

describe('row selection', () => {
  it('protects starting rows and the first ten hazard rows', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (let z = -4; z <= 4; z++) {
        expect(rowKind(seed, z)).toBe('grass');
        for (const obstacle of generateGrassRow(seed, z).obstacles) {
          expect([0, 8]).toContain(obstacle.column);
        }
      }
      for (let z = 5; z <= 14; z++) expect(rowKind(seed, z)).not.toBe('rail');
    }
  });

  it('is independent of generation order, even for very distant rows', () => {
    const rows = [15, 89, 6000, 0x100000001];
    const expected = rows.map(z => rowKind(42, z));
    for (const z of [...rows].reverse()) expect(rowKind(42, z)).toBe(expected[rows.indexOf(z)]);
    expect(() => rowKind(42, 1.5)).toThrow(RangeError);
  });

  it('assigns visual biomes without changing difficulty after its cap', () => {
    expect([0, 39, 40, 79, 80, 119, 120, 6000].map(biomeAtRow)).toEqual([
      'meadow', 'meadow', 'autumn', 'autumn', 'snow', 'snow', 'nightCity', 'nightCity',
    ]);
    expect(difficultyAtRow(75)).toBe(0.5);
    expect(difficultyAtRow(150)).toBe(1);
    expect(difficultyAtRow(6000)).toBe(1);
  });
});

describe('grass', () => {
  it('never duplicates obstacles or blocks a crate, and preserves free columns', () => {
    let crates = 0;
    for (let z = 0; z < 1000; z++) {
      const row = generateGrassRow(42, z);
      const columns = row.obstacles.map(obstacle => obstacle.column);
      expect(new Set(columns).size).toBe(columns.length);
      expect(CONFIG.COLUMNS - columns.length).toBeGreaterThanOrEqual(4);
      expect(row).toEqual(generateGrassRow(42, z));
      if (row.crate) {
        crates++;
        expect(z).toBeGreaterThanOrEqual(8);
        expect(columns).not.toContain(row.crate.column);
        expect(row.crate.column).toBeGreaterThanOrEqual(0);
        expect(row.crate.column).toBeLessThan(9);
      }
    }
    expect(crates).toBeGreaterThan(0);
  });
});
