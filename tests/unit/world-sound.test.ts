import { expect, it } from 'vitest';
import { WorldSound } from '../../client/src/game/world-sound';
import type { BoxingSound } from '../../client/src/game/audio';
import type { RoadRow } from '../../shared/types';
it('plays distinct nearby engines, ignores distant rows and emits one near-miss callback per pass without adding a horn', () => {
  const loops: string[] = [], shots: string[] = [];
  const sound = { beginWorld() {}, endWorld() {}, biome() {}, loop(_key: string, cue: string, _pan: number, level: number) { if (level > 0) loops.push(cue); }, play(cue: string) { shots.push(cue); } } as unknown as BoxingSound;
  const row: RoadRow = { z: 5, kind: 'road', biome: 'meadow', direction: 1, speed: 1, phase: 0, vehicles: [{ kind: 'car', offset: 10, length: 2 }, { kind: 'truck', offset: 7, length: 2 }] };
  const audio = new WorldSound(); audio.onNearMiss = () => shots.push('whoosh');
  audio.update([{ z: 5, row }], 2, 0, sound, 5.5, 5);
  audio.update([{ z: 5, row }], 2, .06, sound, 5.5, 5);
  expect(loops).toContain('car'); expect(shots).toEqual(['whoosh']);
  loops.length = 0; audio.update([{ z: 5, row }], 2, .12, sound, 3, 5); expect(loops).toContain('truck');
  loops.length = 0; audio.update([{ z: 5, row }], 2, .2, sound, 4, 9); expect(loops).not.toContain('car'); expect(loops).not.toContain('truck');
  audio.reset(); audio.update([{ z: 5, row }], 2, 0, sound, 5.5, 5); expect(shots).toHaveLength(2);
});

it('crowd ambience follows actual visible bleachers and is absent for filtered-out spectators', () => {
  const pans: number[] = [], levels: number[] = [];
  const sound = { beginWorld() {}, endWorld() {}, loop(_key: string, cue: string, pan: number, level: number) { if (cue === 'crowd') { pans.push(pan); levels.push(level); } } } as unknown as BoxingSound;
  const arena = { soundSources: () => [{ x: -3, z: 5, count: 6 }, { x: 12, z: 5, count: 0 }] } as unknown as import('../../client/src/game/arena').Arena;
  const audio = new WorldSound(); audio.menu(0, sound, arena, 4, 5);
  expect(pans).toEqual([-1]); expect(levels[0]).toBeGreaterThan(0);
  audio.menu(1, sound, arena, 4, 40); expect(levels[1]).toBe(0);
});
