import { expect, it } from 'vitest';
import { createHopPose, hopTravel, sampleHop } from '../../shared/hop';
import { Movement } from '../../shared/movement';
import type { Row } from '../../shared/types';
const grass = (z: number): Row => ({ kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null });
it('translates immediately during takeoff squash and lands at 120ms before recovery', () => {
  const move = new Movement(grass), pose = createHopPose(); move.input('up');
  sampleHop(move.save(), .001, grass, pose); expect(pose.z).toBeGreaterThan(1); expect(pose.y).toBeGreaterThan(0);
  sampleHop(move.save(), .02, grass, pose); expect(pose.sy).toBe(.8); expect(pose.z).toBeGreaterThan(1);
  sampleHop(move.save(), .06, grass, pose); expect(pose.y).toBeCloseTo(.45); expect(pose.z).toBeCloseTo(1.5);
  move.advance(.12); sampleHop(move.save(), .12, grass, pose); expect(pose.z).toBe(2); expect(pose.y).toBe(0);
  sampleHop(move.save(), .135, grass, pose); expect(pose.sy).toBeCloseTo(.8);
  sampleHop(move.save(), .15, grass, pose); expect(pose.sy).toBe(1);
  expect(move.input('up')).toBe(true); expect(move.hopStart).toBe(.12);
  expect(hopTravel(1)).toBeGreaterThan(0); expect(hopTravel(120)).toBe(1);
});
it('reconstructs identical poses from an in-flight or completed remote snapshot', () => {
  const move = new Movement(grass), a = createHopPose(), b = createHopPose(); move.input('right');
  const start = move.save(); move.advance(.14);
  for (let ms = 0; ms < 120; ms += 1000 / 60) {
    sampleHop(start, ms / 1000, grass, a); sampleHop(move.save(), ms / 1000, grass, b);
    expect(b).toEqual(a);
  }
});
it('curves toward the actual future log slot and meets the authoritative endpoint', () => {
  const rowAt = (z: number): Row => z === 2 ? { kind: 'river', z, biome: 'meadow', direction: 1, speed: 1, phase: 0, logs: [{ offset: 10, length: 4 }] } : grass(z);
  const move = new Movement(rowAt), pose = createHopPose(); move.input('up');
  for (const time of [.02, .07, .11]) {
    move.advance(time); sampleHop(move.save(), time, rowAt, pose);
    expect(pose.x).toBeCloseTo(move.x); expect(pose.z).toBeCloseTo(move.z);
  }
  move.advance(.12); sampleHop(move.save(), .12, rowAt, pose); expect(pose.x).toBeCloseTo(move.x); expect(pose.y).toBeCloseTo(5 / 12 - .1);
});

it('finishes a stale in-flight remote hop at its endpoint without mutating authority', () => {
  const move = new Movement(grass), pose = createHopPose();
  move.input('up'); move.advance(.14); move.input('up'); move.advance(.21);
  const snapshot = move.save(), original = structuredClone(snapshot);
  expect(Number.isInteger(snapshot.z)).toBe(false);
  sampleHop(snapshot, .35, grass, pose);
  expect(pose).toMatchObject({ x: 4, z: 3, y: 0, hopping: false, sx: 1, sy: 1 });
  // Landing effects index the row pool directly; a fractional z used to throw.
  const rows = Array.from({ length: 8 }, (_, z) => grass(z));
  expect(rows[pose.z]!.biome).toBe('meadow'); expect(snapshot).toEqual(original);
  snapshot.dead = 'FLATTENED!'; sampleHop(snapshot, .35, grass, pose);
  expect(pose.z).toBe(snapshot.z);
});
it('holds a stale log landing at the target slot and water surface height', () => {
  const rowAt = (z: number): Row => z === 2 ? { kind: 'river', z, biome: 'meadow', direction: 1, speed: 1, phase: 0, logs: [{ offset: 10, length: 4 }] } : grass(z);
  const move = new Movement(rowAt), pose = createHopPose(); move.input('up'); move.advance(.07);
  sampleHop(move.save(), .2, rowAt, pose);
  expect(pose.x).toBe(move.toX); expect(pose.z).toBe(2);
  expect(pose.y).toBeCloseTo(5 / 12 - .1); expect(pose.hopping).toBe(false);
});
