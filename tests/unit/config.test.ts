import { describe, expect, it } from 'vitest';
import { CONFIG, WORLD, scrollSpeed } from '../../shared/config';

describe('shared configuration', () => {
  it('leaves room for the follow target and top limit inside the shared view', () => {
    expect(CONFIG.LEADER_MAX_AHEAD_ROWS).toBeLessThan(CONFIG.TOP_LIMIT_ROWS);
    expect(CONFIG.TOP_LIMIT_ROWS).toBeLessThan(CONFIG.VIEW_ROWS);
    expect(CONFIG.MIN_HOP_INTERVAL_MS).toBeLessThanOrEqual(CONFIG.HOP_MS);
    expect(WORLD.START_CLEAR_MAX_COLUMN).toBeLessThan(CONFIG.COLUMNS);
    expect(WORLD.GRASS_WEIGHT + WORLD.ROAD_WEIGHT + WORLD.RIVER_WEIGHT + WORLD.RAIL_WEIGHT).toBeCloseTo(1);
  });

  it('waits three seconds, accelerates using round time, and caps scroll speed', () => {
    expect(scrollSpeed(2.999)).toBe(0);
    expect(scrollSpeed(3)).toBeCloseTo(0.286);
    expect(scrollSpeed(30)).toBeCloseTo(0.61);
    expect(scrollSpeed(240)).toBe(1.4);
    expect(scrollSpeed(10_000)).toBe(1.4);
  });
});
