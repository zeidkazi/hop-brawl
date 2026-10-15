import { expect, it } from 'vitest';
import { createHopPose, hopTravel, sampleHop } from '../../shared/hop';
import { Movement } from '../../shared/movement';
import type { Row } from '../../shared/types';
const grass = (z: number): Row => ({ kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null });
it('holds for 40ms, eases into an arc, lands with squash and settles at 140ms', () => {
  const move = new Movement(grass), pose = createHopPose(); move.input('up');
  sampleHop(move.save(), .02, grass, pose); expect(pose.z).toBe(1); expect(pose.sy).toBe(.8); expect(pose.y).toBe(0);
  sampleHop(move.save(), .0775, grass, pose); expect(pose.y).toBeCloseTo(.5); expect(pose.sy).toBeCloseTo(1.15);
  sampleHop(move.save(), .1275, grass, pose); expect(pose.z).toBe(2); expect(pose.sy).toBeCloseTo(.8);
  move.advance(.14); sampleHop(move.save(), .14, grass, pose); expect(pose.sy).toBe(1); expect(pose.y).toBe(0);
  expect(hopTravel(41)).toBeLessThan(1 / 75); expect(hopTravel(114)).toBeGreaterThan(74 / 75);
});
it('reconstructs identical poses from an in-flight or completed remote snapshot', () => {
  const move = new Movement(grass), a = createHopPose(), b = createHopPose(); move.input('right');
  const start = move.save(); move.advance(.14);
  for (let ms = 0; ms < 140; ms += 1000 / 60) {
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
  move.advance(.14); sampleHop(move.save(), .14, rowAt, pose); expect(pose.x).toBeCloseTo(move.x); expect(pose.y).toBeCloseTo(5 / 12 - .1);
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
