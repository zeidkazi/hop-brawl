import { CONFIG, WORLD } from './config';
import type { LaneItem, Position, RailRow, RiverRow, RoadRow, SlowMoWindow } from './types';

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

/** Call with the player's effective hazard row (§4.2a). */
export function vehicleHits(
  row: RoadRow, x: number, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): boolean {
  for (let i = 0; i < row.vehicles.length; i++) {
    const vehicle = row.vehicles[i]!;
    const reach = vehicle.length / 2 - CONFIG.VEHICLE_HITBOX_TRIM + CONFIG.PLAYER_HITBOX / 2;
    if (Math.abs(x - laneItemX(row, vehicle, t, windows)) <= reach) return true;
  }
  return false;
}

export function trainHits(
  row: RailRow, x: number, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): boolean {
  const centre = trainX(row, t, windows);
  return centre !== null && Math.abs(x - centre) <= (WORLD.TRAIN_LENGTH + CONFIG.PLAYER_HITBOX) / 2;
}

/** Returns a stable log index or -1. Water is lethal only on landing. */
export function logAtLanding(
  row: RiverRow, x: number, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): number {
  for (let i = 0; i < row.logs.length; i++) {
    const log = row.logs[i]!;
    const halfExtent = log.length / 2 - CONFIG.LOG_LANDING_TRIM;
    if (Math.abs(x - laneItemX(row, log, t, windows)) <= halfExtent) return i;
  }
  return -1;
}

export function carriedOffEdge(x: number): boolean {
  return x < -WORLD.CARRY_EDGE_MARGIN || x > CONFIG.COLUMNS - 1 + WORLD.CARRY_EDGE_MARGIN;
}

/** Reuse out; visual hop height and movement validation belong to M3. */
export function hopHazardPosition(
  fromX: number, fromZ: number, toX: number, toZ: number, elapsedMs: number, out: Position,
): Position {
  const progress = Math.max(0, Math.min(1, elapsedMs / CONFIG.HOP_MS));
  out.x = fromX + (toX - fromX) * progress;
  out.z = progress < WORLD.HOP_ROW_SWITCH ? fromZ : toZ;
  return out;
}
