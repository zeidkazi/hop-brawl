import { CONFIG, SEGMENTS, WORLD } from './config';
import { hash32, mulberry32, randomBetween, randomInt } from './rng';
import { segmentAt, tierAt } from './segments';
import type { Random } from './rng';
import type { Biome, GrassRow, LaneItem, Obstacle, RailRow, RiverRow, RoadRow, Row, RowKind, Vehicle } from './types';

const BIOMES: readonly Biome[] = ['meadow', 'autumn', 'snow', 'nightCity'];

export function biomeAtRow(z: number): Biome {
  return BIOMES[Math.min(BIOMES.length - 1, Math.max(0, Math.floor(z / CONFIG.BIOME_LENGTH_ROWS)))]!;
}

export function difficultyAtRow(z: number): number {
  return Math.min(1, Math.max(0, z / CONFIG.DIFFICULTY_FULL_ROW));
}

export function rowKind(seed: number, z: number): RowKind { return segmentAt(seed, z).kind; }

function rowRandom(seed: number, z: number): Random {
  const random = mulberry32(hash32(seed, z));
  random(); // The first draw belongs to the weighted row-kind selection.
  return random;
}

export function generateGrassRow(seed: number, z: number): GrassRow {
  const random = rowRandom(seed, z);
  const segment = segmentAt(seed, z), tier = tierAt(z);
  const corridor = hash32(seed, segment.start) % (CONFIG.COLUMNS - SEGMENTS.CORRIDOR_COLUMNS + 1);
  const available: number[] = [];
  for (let column = 0; column < CONFIG.COLUMNS; column++) {
    if (column >= corridor && column < corridor + SEGMENTS.CORRIDOR_COLUMNS) continue;
    if (segment.rest && column >= SEGMENTS.REST_CLEAR_MIN && column <= SEGMENTS.REST_CLEAR_MAX) continue;
    if (z <= WORLD.START_GRASS_LAST_ROW && column >= WORLD.START_CLEAR_MIN_COLUMN && column <= WORLD.START_CLEAR_MAX_COLUMN) continue;
    available.push(column);
  }
  const adjacent = rowKind(seed, z - 1) !== 'grass' || rowKind(seed, z + 1) !== 'grass';
  const maximum = adjacent ? SEGMENTS.ADJACENT_OBSTACLES : tier.obstacles;
  const count = z < 0 ? 0 : randomInt(random, 0, Math.min(maximum, available.length));
  const obstacles: Obstacle[] = [];
  for (let i = 0; i < count; i++) {
    const index = randomInt(random, 0, available.length - 1);
    const column = available.splice(index, 1)[0]!;
    obstacles.push({ column, kind: randomInt(random, 0, 1) === 0 ? 'tree' : 'rock' });
  }
  const freeColumns: number[] = [];
  for (let column = 0; column < CONFIG.COLUMNS; column++) {
    if (!obstacles.some(obstacle => obstacle.column === column)) freeColumns.push(column);
  }
  const crate = z >= CONFIG.CRATE_MIN_ROW && random() < CONFIG.CRATE_CHANCE * (segment.rest ? SEGMENTS.REST_CRATE_MULTIPLIER : 1)
    ? { id: `${z}`, column: freeColumns[randomInt(random, 0, freeColumns.length - 1)]! }
    : null;
  return { kind: 'grass', z, biome: biomeAtRow(z), obstacles, crate };
}

/** Allocate the entire ring, including its seam, with no short final gap. */
function ringGaps(random: Random, count: number, total: number, min: number, max: number): number[] {
  const gaps: number[] = [];
  let remaining = total;
  for (let i = 0; i < count; i++) {
    const after = count - i - 1;
    const lower = Math.max(min, remaining - after * max);
    const upper = Math.min(max, remaining - after * min);
    const gap = after === 0 ? remaining : randomBetween(random, lower, upper);
    gaps.push(gap);
    remaining -= gap;
  }
  return gaps;
}

export function generateRoadRow(seed: number, z: number): RoadRow {
  const random = rowRandom(seed, z);
  const segment = segmentAt(seed, z), tier = tierAt(z);
  const schedule = mulberry32(hash32(seed, segment.start));
  const lane = z - segment.start;
  const firstDirection = schedule() < .5 ? -1 : 1;
  const direction = (lane % 2 ? -firstDirection : firstDirection) as -1 | 1;
  const slow = randomBetween(schedule, tier.car[0], tier.car[1] / SEGMENTS.ROAD_SPEED_RATIO);
  const fast = randomBetween(schedule, slow * SEGMENTS.ROAD_SPEED_RATIO, tier.car[1]);
  const speed = lane % 2 ? fast : slow;
  const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
  const minimumGap = Math.max(WORLD.ROAD_GAP_MIN, speed * CONFIG.MIN_ROAD_TIME_GAP_S);
  // These bounds keep every possible 80/20 car/truck draw feasible.
  const minimumCount = Math.ceil(span / (WORLD.CAR_LENGTH + WORLD.ROAD_GAP_MAX));
  const maximumCount = Math.floor(span / (WORLD.TRUCK_LENGTH + minimumGap));
  const count = randomInt(random, minimumCount, maximumCount);
  const kinds: ('car' | 'truck')[] = [];
  const lengths: number[] = [];
  let occupied = 0;
  for (let i = 0; i < count; i++) {
    const car = z < SEGMENTS.TIERS[1].start || random() < WORLD.CAR_CHANCE;
    const length = car ? WORLD.CAR_LENGTH : WORLD.TRUCK_LENGTH;
    kinds.push(car ? 'car' : 'truck');
    lengths.push(length);
    occupied += length;
  }
  const gaps = ringGaps(random, count, span - occupied, minimumGap, WORLD.ROAD_GAP_MAX);
  const vehicles: Vehicle[] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    const length = lengths[i]!;
    vehicles.push({ kind: kinds[i]!, length, offset: start + length / 2 });
    start += length + gaps[i]!;
  }
  return {
    kind: 'road', z, biome: biomeAtRow(z), direction, speed,
    phase: randomBetween(random, 0, span), vehicles,
  };
}

export function generateRiverRow(seed: number, z: number): RiverRow {
  const segment = segmentAt(seed, z), tier = tierAt(z);
  const random = mulberry32(hash32(seed, segment.start));
  const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
  const length = randomInt(random, tier.length[0], tier.length[1]);
  const count = Math.floor(span / (length + SEGMENTS.LOG_GAP_MIN));
  const pitch = span / count;
  const speed = randomBetween(random, tier.log[0], tier.log[1]);
  const firstDirection = random() < .5 ? -1 : 1;
  const direction = ((z - segment.start) % 2 ? -firstDirection : firstDirection) as -1 | 1;
  const logs: LaneItem[] = [];
  for (let i = 0; i < count; i++) logs.push({ offset: i * pitch + length / 2, length });
  return { kind: 'river', z, biome: biomeAtRow(z), direction, speed,
    phase: rowRandom(seed, z)() * span, logs };
}

export function generateRailRow(seed: number, z: number): RailRow {
  const random = rowRandom(seed, z);
  const period = randomBetween(random, SEGMENTS.TRAIN_PERIOD_MIN_S, WORLD.TRAIN_PERIOD_MAX_S);
  return {
    kind: 'rail', z, biome: biomeAtRow(z), period, warning: tierAt(z).warning,
    phase: randomBetween(random, 0, period),
    direction: randomInt(random, 0, 1) === 0 ? -1 : 1,
  };
}

/** Pure row generation. Cache/recycle these descriptors outside the render loop. */
export function generateRow(seed: number, z: number): Row {
  switch (rowKind(seed, z)) {
    case 'grass': return generateGrassRow(seed, z);
    case 'road': return generateRoadRow(seed, z);
    case 'river': return generateRiverRow(seed, z);
    case 'rail': return generateRailRow(seed, z);
  }
}
