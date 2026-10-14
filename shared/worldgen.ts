import { CONFIG, WORLD } from './config';
import { hash32, mulberry32, randomBetween, randomInt } from './rng';
import type { Random } from './rng';
import type { Biome, GrassRow, LaneItem, Obstacle, RiverRow, RoadRow, RowKind, Vehicle } from './types';

const BIOMES: readonly Biome[] = ['meadow', 'autumn', 'snow', 'nightCity'];

export function biomeAtRow(z: number): Biome {
  return BIOMES[Math.min(BIOMES.length - 1, Math.max(0, Math.floor(z / CONFIG.BIOME_LENGTH_ROWS)))]!;
}

export function difficultyAtRow(z: number): number {
  return Math.min(1, Math.max(0, z / CONFIG.DIFFICULTY_FULL_ROW));
}

function candidateKind(seed: number, z: number): RowKind {
  if (z <= WORLD.START_GRASS_LAST_ROW) return 'grass';
  const roll = mulberry32(hash32(seed, z))();
  if (roll < WORLD.GRASS_WEIGHT) return 'grass';
  if (roll < WORLD.GRASS_WEIGHT + WORLD.ROAD_WEIGHT) return 'road';
  if (roll < WORLD.GRASS_WEIGHT + WORLD.ROAD_WEIGHT + WORLD.RIVER_WEIGHT) return 'river';
  return z <= WORLD.EARLY_LAST_ROW ? 'grass' : 'rail';
}

/** Bounded lookback lets a distant row be generated without replaying the world. */
export function rowKind(seed: number, z: number): RowKind {
  if (!Number.isSafeInteger(z)) throw new RangeError('Row must be a safe integer');
  const kind = candidateKind(seed, z);
  if (kind === 'grass') return kind;
  const limit = kind === 'road'
    ? (z <= WORLD.EARLY_LAST_ROW ? WORLD.EARLY_MAX_CONSECUTIVE_ROAD : WORLD.MAX_CONSECUTIVE_ROAD)
    : kind === 'river' ? WORLD.MAX_CONSECUTIVE_RIVER : WORLD.MAX_CONSECUTIVE_RAIL;
  for (let offset = 1; offset <= limit; offset++) {
    if (candidateKind(seed, z - offset) !== kind) return kind;
  }
  return 'grass';
}

function rowRandom(seed: number, z: number): Random {
  const random = mulberry32(hash32(seed, z));
  random(); // The first draw belongs to the weighted row-kind selection.
  return random;
}

export function generateGrassRow(seed: number, z: number): GrassRow {
  const random = rowRandom(seed, z);
  const available: number[] = [];
  for (let column = 0; column < CONFIG.COLUMNS; column++) {
    if (z <= WORLD.START_GRASS_LAST_ROW
      && column >= WORLD.START_CLEAR_MIN_COLUMN && column <= WORLD.START_CLEAR_MAX_COLUMN) continue;
    available.push(column);
  }
  const count = z < 0 ? 0 : randomInt(random, 0, Math.min(WORLD.MAX_GRASS_OBSTACLES, available.length));
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
  const crate = z >= CONFIG.CRATE_MIN_ROW && random() < CONFIG.CRATE_CHANCE
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
  const direction = randomInt(random, 0, 1) === 0 ? -1 : 1;
  const rawSpeed = randomBetween(random, WORLD.ROAD_SPEED_MIN, WORLD.ROAD_SPEED_MAX)
    * (1 + WORLD.ROAD_DIFFICULTY_GAIN * difficultyAtRow(z));
  const speed = z <= WORLD.EARLY_LAST_ROW ? Math.min(rawSpeed, WORLD.EARLY_ROAD_SPEED_CAP) : rawSpeed;
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
    const car = random() < WORLD.CAR_CHANCE;
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
  const random = rowRandom(seed, z);
  const span = WORLD.LOOP_MAX_X - WORLD.LOOP_MIN_X;
  const gain = 1 + WORLD.RIVER_DIFFICULTY_GAIN * difficultyAtRow(z);
  const speedMaximum = WORLD.RIVER_SPEED_MAX * gain;
  const options: { length: number; count: number; pitch: number; minimumSpeed: number }[] = [];
  for (let length = WORLD.LOG_LENGTH_MIN; length <= WORLD.LOG_LENGTH_MAX; length++) {
    const fewest = Math.ceil(span / (length + WORLD.RIVER_GAP_MAX));
    const most = Math.floor(span / (length + WORLD.RIVER_GAP_MIN));
    for (let count = fewest; count <= most; count++) {
      const pitch = span / count;
      const minimumSpeed = Math.max(WORLD.RIVER_SPEED_MIN * gain, pitch / CONFIG.MAX_LOG_WAIT_S);
      if (minimumSpeed <= speedMaximum) options.push({ length, count, pitch, minimumSpeed });
    }
  }
  // Pick only ring schedules that satisfy both spatial gaps and arrival times.
  const option = options[randomInt(random, 0, options.length - 1)];
  if (!option) throw new RangeError('River tunables have no solvable repeating schedule');
  let speed = randomBetween(random, option.minimumSpeed, speedMaximum);
  let direction: -1 | 1 = randomInt(random, 0, 1) === 0 ? -1 : 1;
  if (rowKind(seed, z - 1) === 'river') {
    // Recursion is bounded by MAX_CONSECUTIVE_RIVER, never by world distance.
    const previous = generateRiverRow(seed, z - 1);
    direction = previous.direction === 1 ? -1 : 1;
    if (speed === previous.speed) {
      speed = speed > option.minimumSpeed
        ? (speed + option.minimumSpeed) / 2
        : (speed + speedMaximum) / 2;
    }
  }
  const logs: LaneItem[] = [];
  for (let i = 0; i < option.count; i++) {
    logs.push({ offset: i * option.pitch + option.length / 2, length: option.length });
  }
  return {
    kind: 'river', z, biome: biomeAtRow(z), direction, speed,
    phase: randomBetween(random, 0, span), logs,
  };
}
