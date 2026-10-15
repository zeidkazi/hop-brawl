import { expect, it } from 'vitest';
import { RailSound } from '../../client/src/game/rail-sound';
import { BoxingSound } from '../../client/src/game/boxing-feedback';
import { generateRow } from '../../shared/worldgen';

it('bells during the rail warning, horns once on approach, and resets on a new round', () => {
  const rows = Array.from({ length: 200 }, (_, z) => ({ z, row: generateRow(42, z) }));
  const slot = rows.find(s => s.row.kind === 'rail')!; if (slot.row.kind !== 'rail') throw new Error('fixture');
  const sound = new BoxingSound(), cues: string[] = []; sound.play = cue => { cues.push(cue); return 0; };
  const audio = new RailSound(), row = slot.row;
  const warning = row.period - row.phase - .4 + row.period;
  audio.update([slot], slot.z - 1, warning, sound); audio.update([slot], slot.z - 1, warning + .1, sound);
  expect(cues).toEqual(['horn', 'bell', 'bell']);
  audio.update([slot], slot.z - 1, warning + 1, sound);
  audio.update([slot], slot.z - 1, warning + row.period, sound);
  expect(cues.filter(c => c === 'horn')).toHaveLength(2);
  audio.reset(); audio.update([slot], slot.z - 1, warning, sound);
  expect(cues.filter(c => c === 'horn')).toHaveLength(3);
});

it('pans both crossing posts and moving trains independently', () => {
  const slot = Array.from({ length: 100 }, (_, z) => ({ z, row: generateRow(7, z) })).find(s => s.row.kind === 'rail')!;
  if (slot.row.kind !== 'rail') throw new Error('fixture');
  const sound = new BoxingSound(), bells: number[] = [], pans: number[] = [];
  sound.play = (cue, pan = 0) => { if (cue === 'bell') bells.push(pan); return 0; };
  sound.loop = (_key, cue, pan) => { if (cue === 'train') pans.push(pan); };
  const audio = new RailSound(), start = slot.row.period - slot.row.phase;
  audio.update([slot], slot.z - 1, start - .6, sound);
  expect(bells[0]).toBeLessThan(0); expect(bells[1]).toBeGreaterThan(0);
  audio.update([slot], slot.z - 1, start + .1, sound);
  audio.update([slot], slot.z - 1, start + 1, sound);
  expect(pans[0]).not.toBe(pans[1]);
});
