export type Random = () => number;

/** Mulberry32: unsigned 32-bit state, deterministic across JS runtimes. */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Avalanche the seed and both words of a row index; no global RNG state. */
export function hash32(seed: number, row: number): number {
  let value = (seed >>> 0) ^ Math.imul(row | 0, 0x9e3779b1);
  value ^= Math.imul(Math.floor(row / 0x100000000), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function randomBetween(random: Random, min: number, max: number): number {
  return min + random() * (max - min);
}

/** Inclusive integer bounds, used only during generation. */
export function randomInt(random: Random, min: number, max: number): number {
  return Math.floor(randomBetween(random, min, max + 1));
}
