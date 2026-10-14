import { describe, expect, it } from 'vitest';
import { carriedOffEdge, hopHazardPosition, logAtLanding, trainHits, vehicleHits } from '../../shared/hazards';
import type { RailRow, RiverRow, RoadRow } from '../../shared/types';

const road: RoadRow = {
  kind: 'road', z: 20, biome: 'meadow', direction: 1, speed: 2, phase: 0,
  vehicles: [{ kind: 'car', length: 1, offset: 6 }],
};
const river: RiverRow = {
  kind: 'river', z: 21, biome: 'meadow', direction: 1, speed: 2, phase: 0,
  logs: [{ length: 2, offset: 6 }],
};
const rail: RailRow = { kind: 'rail', z: 22, biome: 'meadow', direction: 1, period: 8, phase: 0 };

describe('forgiving hitboxes', () => {
  it('trims cars by 0.1 at each end and includes the 0.6-wide player', () => {
    expect(vehicleHits(road, 0.7, 0)).toBe(true);
    expect(vehicleHits(road, -0.7, 0)).toBe(true);
    expect(vehicleHits(road, 0.70001, 0)).toBe(false);
    expect(vehicleHits(road, -0.70001, 0)).toBe(false);
    expect(vehicleHits(road, 2, 1)).toBe(true);
    expect(vehicleHits(road, 2, 0)).toBe(false);
  });

  it('uses the full train length and cannot collide between passes', () => {
    // At t=0.5 the train centre is x=0.5; reach is 6 + 0.3.
    expect(trainHits(rail, 6.799, 0.5)).toBe(true);
    expect(trainHits(rail, 6.801, 0.5)).toBe(false);
    expect(trainHits(rail, 0, 4)).toBe(false);
  });

  it('accepts landing points within 0.6 of a slot, including exact edges', () => {
    expect(logAtLanding(river, 1.1, 0)).toBe(0);
    expect(logAtLanding(river, -1.1, 0)).toBe(0);
    expect(logAtLanding(river, 1.5, 0)).toBe(0);
    expect(logAtLanding(river, -1.5, 0)).toBe(0);
    expect(logAtLanding(river, 1.50001, 0)).toBe(-1);
    expect(logAtLanding(river, -1.50001, 0)).toBe(-1);
    expect(logAtLanding(river, 2, 1)).toBe(0);
    expect(logAtLanding(river, 0, 1)).toBe(-1);
  });

  it('kills carried players only beyond the specified half-tile edges', () => {
    expect(carriedOffEdge(-0.5)).toBe(false);
    expect(carriedOffEdge(8.5)).toBe(false);
    expect(carriedOffEdge(-0.50001)).toBe(true);
    expect(carriedOffEdge(8.50001)).toBe(true);
  });
});

describe('hop hazard row', () => {
  it('switches at 50% for forward and backward hops without allocating output', () => {
    const out = { x: 0, z: 0 };
    expect(hopHazardPosition(4, 5, 4, 6, 69.99, out)).toBe(out);
    expect(out).toEqual({ x: 4, z: 5 });
    hopHazardPosition(4, 5, 4, 6, 70, out);
    expect(out).toEqual({ x: 4, z: 6 });
    hopHazardPosition(4, 6, 4, 5, 70, out);
    expect(out).toEqual({ x: 4, z: 5 });
  });

  it('interpolates sideways from fractional log positions and clamps elapsed time', () => {
    const out = { x: 0, z: 0 };
    hopHazardPosition(3.2, 5, 4.2, 5, 70, out);
    expect(out).toEqual({ x: 3.7, z: 5 });
    hopHazardPosition(3.2, 5, 4.2, 5, 1000, out);
    expect(out).toEqual({ x: 4.2, z: 5 });
    hopHazardPosition(3.2, 5, 4.2, 5, -1, out);
    expect(out).toEqual({ x: 3.2, z: 5 });
  });
});
