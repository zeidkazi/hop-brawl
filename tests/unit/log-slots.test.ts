import { expect, it } from 'vitest';
import { logSlotAtLanding, logSlotX } from '../../shared/hazards';
import { Movement } from '../../shared/movement';
import type { Row, RiverRow } from '../../shared/types';
const river: RiverRow = { kind: 'river', z: 2, biome: 'meadow', direction: 1, speed: 1, phase: 0, logs: [{ offset: 10, length: 3 }] };
const rowAt = (z: number): Row => z === 2 ? river : { kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null };
it('lands exactly without a zero-step loop at late absolute round times', () => {
  const player = new Movement(z => ({ kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null }));
  player.advance(100.123); player.input('up'); player.advance(100.5);
  expect(player.z).toBe(2); expect(player.hopping).toBe(false);
});
it('curves to the nearest slot at landing time and carries the exact slot thereafter', () => {
  const player = new Movement(rowAt); player.input('up');
  const expected = logSlotAtLanding(river, 4, .14, { log: -1, slot: -1, x: 0 });
  player.advance(.02); expect(player.x).toBe(4); // anticipation holds the source tile
  player.advance(.0775); expect(player.x).toBeCloseTo(4 + (expected.x - 4) * .25);
  player.advance(.14); expect(player.x).toBeCloseTo(expected.x); expect(player.slotIndex).toBe(expected.slot);
  player.advance(1); expect(player.x).toBe(logSlotX(river, player.logIndex, player.slotIndex, 1));
  const slot = player.slotIndex; player.input('right'); player.advance(1.14);
  expect(player.slotIndex).toBe(slot + 1); expect(player.onLog).toBe(true);
  player.input('right'); player.advance(1.28); expect(player.dead).toBeNull(); expect(player.onLog).toBe(true);
});
it('assists up to one tile and breaks equal-distance ties toward travel', () => {
  const out = { log: -1, slot: -1, x: 0 };
  const row = { ...river, logs: [{ offset: 10, length: 2 }] };
  expect(logSlotAtLanding(row, 4, 0, out).x).toBe(4.5);
  expect(logSlotAtLanding({ ...row, direction: -1 }, 4, 0, out).x).toBe(3.5);
  expect(logSlotAtLanding(row, 5.5, 0, out).log).toBe(0);
  expect(logSlotAtLanding(row, 5.501, 0, out).log).toBe(-1);
});
it('chooses the nearest of neighbouring logs, and evaluates a moving target at landing', () => {
  const row = { ...river, logs: [{ offset: 6, length: 2 }, { offset: 9, length: 2 }] };
  const out = { log: -1, slot: -1, x: 0 };
  expect(logSlotAtLanding(row, 2, 0, out).log).toBe(1);
  expect(logSlotAtLanding(row, 2, 2, out).log).toBe(0);
});
