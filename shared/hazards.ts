import { CONFIG, WORLD } from './config';
import type { LaneItem, RailRow, RiverRow, RoadRow, SlowMoWindow } from './types';

const NO_SLOW_MO: readonly SlowMoWindow[] = Object.freeze([]);

/** Create on a pickup event, never inside the render loop. Times are seconds. */
export function slowMoWindow(start: number): SlowMoWindow {
  return { start, end: start + CONFIG.SLOWMO_MS / 1000 };
}

/**
 * Integrate the union, not the sum, of slow windows in [0, t].
 * Handles unsorted/duplicate/nested windows without sorting or allocating.
 * Retain completed windows for the round: their accumulated offset persists.
 */
export function effectiveTime(t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO): number {
  let cursor = 0;
  let overlap = 0;
  while (cursor < t && windows.length > 0) {
    let coveredUntil = cursor;
    let nextStart = t;
    for (let i = 0; i < windows.length; i++) {
      const window = windows[i]!;
      if (window.end <= window.start || window.end <= cursor) continue;
      if (window.start <= cursor) {
        coveredUntil = Math.max(coveredUntil, Math.min(t, window.end));
      } else {
        nextStart = Math.min(nextStart, window.start);
      }
    }
    if (coveredUntil > cursor) {
      overlap += coveredUntil - cursor;
      cursor = coveredUntil;
    } else {
      cursor = nextStart;
    }
  }
  return t - (1 - CONFIG.SLOWMO_FACTOR) * overlap;
}

function modulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/** No accumulated delta: clients and server can sample the same instant directly. */
export function laneItemX(
  row: RoadRow | RiverRow,
  item: LaneItem,
  t: number,
  windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): number {
  const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
  return WORLD.LOOP_MIN_X + modulo(
    item.offset + row.phase + row.direction * row.speed * effectiveTime(t, windows), span,
  );
}

export function trainCycle(
  row: RailRow, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): number {
  return modulo(effectiveTime(t, windows) + row.phase, row.period);
}

export function trainWarning(
  row: RailRow, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): boolean {
  return trainCycle(row, t, windows) >= row.period - WORLD.TRAIN_WARNING_S;
}

/** null while the train is between passes; both endpoints are fully off-screen. */
export function trainX(
  row: RailRow, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): number | null {
  const cycle = trainCycle(row, t, windows);
  const travel = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X + WORLD.TRAIN_LENGTH;
  if (cycle >= travel / WORLD.TRAIN_SPEED) return null;
  const distance = cycle * WORLD.TRAIN_SPEED;
  return row.direction === 1
    ? WORLD.LOOP_MIN_X - WORLD.TRAIN_LENGTH / 2 + distance
    : WORLD.LOOP_MAX_X + WORLD.TRAIN_LENGTH / 2 - distance;
}
