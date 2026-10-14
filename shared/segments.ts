import { SEGMENTS } from './config';
import { hash32, mulberry32, randomInt } from './rng';
import type { RowKind } from './types';

export interface Segment { readonly kind: RowKind; readonly start: number; readonly end: number; readonly rest: boolean }
export function tierAt(z: number) {
  for (let i = SEGMENTS.TIERS.length - 1; i > 0; i--) if (z >= SEGMENTS.TIERS[i]!.start) return SEGMENTS.TIERS[i]!;
  return SEGMENTS.TIERS[0];
}
let cachedSeed = NaN, cachedAnchor = NaN;
let cached: Segment[] = [];

/** Bounded 20-row chapters permit deterministic random access, including very distant rows. */
export function segmentAt(seed: number, z: number): Segment {
  if (!Number.isSafeInteger(z)) throw new RangeError('Row must be a safe integer');
  if (z < 0) return { kind: 'grass', start: z, end: z + 1, rest: false };
  const intro = SEGMENTS.INTRO_CHAPTERS.find(chapter => z >= chapter.start && z < chapter.end);
  const anchor = intro?.start ?? Math.floor(z / SEGMENTS.REST_EVERY) * SEGMENTS.REST_EVERY;
  if (cachedSeed !== seed || cachedAnchor !== anchor) {
    const random = mulberry32(hash32(seed, anchor));
    const end = intro?.end ?? anchor + SEGMENTS.REST_EVERY;
    const segments: Segment[] = [];
    let cursor = anchor;
    const add = (kind: RowKind, length: number, rest = false) => { segments.push({ kind, start: cursor, end: cursor + length, rest }); cursor += length; };
    if (intro) for (const [kind, length, rest] of intro.prefix) add(kind, length, rest);
    else add('grass', SEGMENTS.REST_ROWS, true);
    // Solve the small chapter exactly: it always ends in a hazard before the next rest stop.
    const fill = (at: number, grass: boolean): boolean => {
      if (at === end) return grass;
      const tier = tierAt(at), options: { kind: RowKind; length: number }[] = [];
      const kinds: readonly RowKind[] = grass ? ['grass'] : tier.rail[1] ? ['road', 'river', 'rail'] : ['road', 'river'];
      for (const kind of kinds) {
        const range = tier[kind === 'road' ? 'road' : kind === 'river' ? 'river' : kind === 'rail' ? 'rail' : 'grass'];
        for (let length = range[0]; length <= range[1]; length++) if (at + length <= end) options.push({ kind, length });
      }
      for (let i = options.length - 1; i > 0; i--) { const j = randomInt(random, 0, i); [options[i], options[j]] = [options[j]!, options[i]!]; }
      for (const option of options) {
        segments.push({ kind: option.kind, start: at, end: at + option.length, rest: false });
        if (fill(at + option.length, !grass)) return true;
        segments.pop();
      }
      return false;
    };
    if (cursor < end && !fill(cursor, segments.at(-1)!.kind !== 'grass')) throw new Error('Unsatisfiable segment chapter');
    cachedSeed = seed; cachedAnchor = anchor; cached = segments;
  }
  return cached.find(segment => z >= segment.start && z < segment.end)!;
}
