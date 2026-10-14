import { describe, expect, it } from 'vitest';
import { CONFIG, WORLD } from '../../shared/config';
import { generateRoadRow } from '../../shared/worldgen';

describe('road traffic schedules', () => {
  it('honours the early cap and difficulty speed range', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (let z = 5; z <= 14; z++) expect(generateRoadRow(seed, z).speed).toBeLessThanOrEqual(2);
      const row = generateRoadRow(seed, 150);
      expect(row.speed).toBeGreaterThanOrEqual(2.7);
      expect(row.speed).toBeLessThanOrEqual(5.4);
    }
  });

  it('keeps every gap in range and at least 0.6 seconds, including the seam', () => {
    const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
    for (let seed = 0; seed < 1000; seed++) {
      const row = generateRoadRow(seed, 300);
      expect(row).toEqual(generateRoadRow(seed, 300));
      for (let i = 0; i < row.vehicles.length; i++) {
        const current = row.vehicles[i]!;
        const next = row.vehicles[(i + 1) % row.vehicles.length]!;
        const distance = next.offset + (i === row.vehicles.length - 1 ? span : 0) - current.offset;
        const gap = distance - (current.length + next.length) / 2;
        expect(current.length).toBe(current.kind === 'car' ? 1 : 2);
        expect(gap).toBeGreaterThanOrEqual(WORLD.ROAD_GAP_MIN - 1e-10);
        expect(gap).toBeLessThanOrEqual(WORLD.ROAD_GAP_MAX + 1e-10);
        expect(gap / row.speed).toBeGreaterThanOrEqual(CONFIG.MIN_ROAD_TIME_GAP_S - 1e-10);
      }
    }
  });
});
