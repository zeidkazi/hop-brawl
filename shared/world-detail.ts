import { CONFIG, DETAIL, SEGMENTS, WORLD } from './config';
import { hash32, mulberry32 } from './rng';
import { segmentAt, tierAt } from './segments';
import type { GrassRow, RoadRow, Vehicle } from './types';
export const GRASS_PROPS = ['flowers', 'grass_tuft', 'small_bush', 'stump', 'pebbles', 'fence_piece'] as const;
export interface Decoration { x: number; kind: typeof GRASS_PROPS[number]; turn: number }
/** Generated only when a row enters the pool; all footprints fit inside that grass row. */
export function grassDecor(seed: number, row: GrassRow): Decoration[] {
  const segment = segmentAt(seed, row.z), corridor = hash32(seed, segment.start) % (CONFIG.COLUMNS - SEGMENTS.CORRIDOR_COLUMNS + 1);
  const random = mulberry32(hash32(seed ^ DETAIL.SEED_SALT, row.z));
  const columns: number[] = [DETAIL.OUTSIDE_LEFT, DETAIL.OUTSIDE_RIGHT];
  for (let x = 0; x < CONFIG.COLUMNS; x++) {
    if (x >= corridor && x < corridor + SEGMENTS.CORRIDOR_COLUMNS) continue;
    if (segment.rest && x >= SEGMENTS.REST_CLEAR_MIN && x <= SEGMENTS.REST_CLEAR_MAX) continue;
    if (row.z <= WORLD.START_GRASS_LAST_ROW && x >= WORLD.START_CLEAR_MIN_COLUMN && x <= WORLD.START_CLEAR_MAX_COLUMN) continue;
    if (row.obstacles.some(o => o.column === x) || row.crate?.column === x) continue;
    columns.push(x);
  }
  const count = DETAIL.PROP_MIN + Math.floor(random() * (DETAIL.PROP_MAX - DETAIL.PROP_MIN + 1)), result: Decoration[] = [];
  for (let i = 0; i < count; i++) {
    // Extra roadside slots ensure even a narrow rest row always has 3-6 distinct decorations.
    const x = columns.length ? columns.splice(Math.floor(random() * columns.length), 1)[0]! : (i % 2 ? DETAIL.OUTSIDE_LEFT - i : DETAIL.OUTSIDE_RIGHT + i);
    result.push({ x, kind: GRASS_PROPS[Math.floor(random() * GRASS_PROPS.length)]!, turn: Math.floor(random() * 2) * Math.PI });
  }
  return result;
}
/** Type-specific bands follow the existing deterministic lane speed, preserving all traffic gaps. */
export function vehicleStyle(row: RoadRow, vehicle: Vehicle): string {
  const tier = tierAt(row.z), fraction = Math.max(0, Math.min(.999999, (row.speed - tier.car[0]) / (tier.car[1] - tier.car[0])));
  const styles = vehicle.kind === 'truck' ? DETAIL.TRUCK_STYLES : DETAIL.CAR_STYLES;
  return styles[Math.floor(fraction * styles.length)]!;
}
