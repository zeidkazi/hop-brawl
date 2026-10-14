import { CONFIG, SEGMENTS, WORLD } from './config';
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
  return trainCycle(row, t, windows) >= row.period - (row.warning ?? WORLD.TRAIN_WARNING_S);
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

export interface LogSlot { log: number; slot: number; x: number }
export function logSlotX(row: RiverRow, log: number, slot: number, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO): number {
  const item = row.logs[log]!;
  return laneItemX(row, item, t, windows) - (item.length - SEGMENTS.LOG_SLOT_WIDTH) / 2 + slot * SEGMENTS.LOG_SLOT_WIDTH;
}
/** Nearest slot at landing time. Equal distances favor the log's direction of travel. */
export function logSlotAtLanding(row: RiverRow, x: number, t: number, out: LogSlot,
  windows: readonly SlowMoWindow[] = NO_SLOW_MO): LogSlot {
  out.log = -1; out.slot = -1; out.x = x;
  let best = SEGMENTS.LOG_SLOT_REACH + Number.EPSILON * 8;
  for (let i = 0; i < row.logs.length; i++) {
    const item = row.logs[i]!;
    for (let slot = 0; slot < item.length; slot++) {
      const centre = logSlotX(row, i, slot, t, windows), distance = Math.abs(x - centre);
      if (distance < best - Number.EPSILON * 8 || (Math.abs(distance - best) <= Number.EPSILON * 8
        && distance <= SEGMENTS.LOG_SLOT_REACH && (out.log < 0 || (centre - out.x) * row.direction > 0))) {
        best = distance; out.log = i; out.slot = slot; out.x = centre;
      }
    }
  }
  return out;
}
const landingSlot: LogSlot = { log: -1, slot: -1, x: 0 };
/** Compatibility index query; support now follows section 30.6 slot reach. */
export function logAtLanding(
  row: RiverRow, x: number, t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO,
): number {
  return logSlotAtLanding(row, x, t, landingSlot, windows).log;
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
