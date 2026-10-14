import { describe, expect, it } from 'vitest';
import { laneItemX, slowMoWindow, trainWarning, trainX } from '../../shared/hazards';
import type { RailRow, RoadRow } from '../../shared/types';
import { generateRow } from '../../shared/worldgen';

const road: RoadRow = {
  kind: 'road', z: 20, biome: 'meadow', direction: 1, speed: 2, phase: 0,
  vehicles: [{ kind: 'car', length: 1, offset: 6 }],
};
const rail: RailRow = { kind: 'rail', z: 20, biome: 'meadow', direction: 1, period: 8, phase: 0 };

describe('hazard positions', () => {
  it('advances by synced time and wraps in both directions', () => {
    const vehicle = road.vehicles[0]!;
    expect(laneItemX(road, vehicle, 0)).toBe(0);
    expect(laneItemX(road, vehicle, 2)).toBe(4);
    expect(laneItemX(road, vehicle, 10.5)).toBe(0);
    const reversed = { ...road, direction: -1 as const };
    expect(laneItemX(reversed, vehicle, 2)).toBe(-4);
    expect(laneItemX(reversed, vehicle, 4)).toBe(13);
    expect(laneItemX(road, vehicle, 1_000_000)).toBeGreaterThanOrEqual(-6);
    expect(laneItemX(road, vehicle, 1_000_000)).toBeLessThan(15);
  });

  it('reconstructs identical positions from independent worlds and ignores frame history', () => {
    for (let z = 5; z < 300; z++) {
      const client = generateRow(20261030, z);
      const server = generateRow(20261030, z);
      const times = [0, 0.14, 1, 30, 240, 10_000];
      for (const t of times) {
        if ((client.kind === 'road' && server.kind === 'road')
          || (client.kind === 'river' && server.kind === 'river')) {
          const a = client.kind === 'road' ? client.vehicles : client.logs;
          const b = server.kind === 'road' ? server.vehicles : server.logs;
          for (let i = 0; i < a.length; i++) {
            const expected = laneItemX(server, b[i]!, t);
            laneItemX(client, a[i]!, 999);
            expect(laneItemX(client, a[i]!, t)).toBe(expected);
          }
        } else if (client.kind === 'rail' && server.kind === 'rail') {
          expect(trainX(client, t)).toBe(trainX(server, t));
          expect(trainWarning(client, t)).toBe(trainWarning(server, t));
        }
      }
    }
  });

  it('slows hazards without jumping when a boost begins or expires', () => {
    const windows = [slowMoWindow(1)];
    const vehicle = road.vehicles[0]!;
    expect(laneItemX(road, vehicle, 1, windows)).toBe(2);
    expect(laneItemX(road, vehicle, 2, windows)).toBe(3);
    expect(laneItemX(road, vehicle, 4, windows)).toBe(5);
    expect(laneItemX(road, vehicle, 5, windows)).toBe(7);
  });
});

describe('trains', () => {
  it('warns for 1.5 seconds before the next pass and traverses at 25 tiles/s', () => {
    expect(trainWarning(rail, 6.499)).toBe(false);
    expect(trainWarning(rail, 6.5)).toBe(true);
    expect(trainWarning(rail, 7.999)).toBe(true);
    expect(trainWarning(rail, 8)).toBe(false);
    expect(trainX(rail, 0)).toBe(-12);
    expect(trainX(rail, 0.5)).toBe(0.5);
    expect(trainX(rail, 1.32)).toBeNull();
    expect(trainX(rail, 4)).toBeNull();
    expect(trainX(rail, 8)).toBe(-12);
    expect(trainX({ ...rail, direction: -1 }, 0.5)).toBe(8.5);
  });

  it('applies the same time warp to train movement and warning phase', () => {
    const windows = [slowMoWindow(6)];
    expect(trainWarning(rail, 6.9, windows)).toBe(false);
    expect(trainWarning(rail, 7, windows)).toBe(true);
    expect(trainX(rail, 9.5, windows)).toBe(-12);
  });
});
