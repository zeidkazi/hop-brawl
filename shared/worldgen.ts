import { CONFIG, WORLD } from './config';
import { hash32, mulberry32, randomInt } from './rng';
import type { Random } from './rng';
import type { Biome, GrassRow, Obstacle, RowKind } from './types';

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
