import { expect, it } from 'vitest';
import { WorldSound } from '../../client/src/game/world-sound';
import type { BoxingSound } from '../../client/src/game/audio';
import type { RoadRow } from '../../shared/types';
it('plays distinct nearby engines, ignores distant rows and emits one horn per near-miss pass', () => {
  const loops: string[] = [], shots: string[] = [];
  const sound = { beginWorld() {}, endWorld() {}, biome() {}, loop(_key: string, cue: string, _pan: number, level: number) { if (level > 0) loops.push(cue); }, play(cue: string) { shots.push(cue); } } as unknown as BoxingSound;
  const row: RoadRow = { z: 5, kind: 'road', biome: 'meadow', direction: 1, speed: 1, phase: 0, vehicles: [{ kind: 'car', offset: 10, length: 2 }, { kind: 'truck', offset: 7, length: 2 }] };
  const audio = new WorldSound();
  audio.update([{ z: 5, row }], 2, 0, sound, 5.5, 5);
  audio.update([{ z: 5, row }], 2, .06, sound, 5.5, 5);
  expect(loops).toContain('car'); expect(shots).toEqual(['honk']);
  loops.length = 0; audio.update([{ z: 5, row }], 2, .12, sound, 3, 5); expect(loops).toContain('truck');
  loops.length = 0; audio.update([{ z: 5, row }], 2, .2, sound, 4, 9); expect(loops).not.toContain('car'); expect(loops).not.toContain('truck');
  audio.reset(); audio.update([{ z: 5, row }], 2, 0, sound, 5.5, 5); expect(shots).toHaveLength(2);
});
