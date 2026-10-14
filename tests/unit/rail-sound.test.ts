import { expect, it } from 'vitest';
import { RailSound } from '../../client/src/game/rail-sound';
import { BoxingSound } from '../../client/src/game/boxing-feedback';
import { generateRow } from '../../shared/worldgen';

it('bells during the rail warning, horns once on approach, and resets on a new round', () => {
  const rows = Array.from({ length: 200 }, (_, z) => ({ z, row: generateRow(42, z) }));
  const slot = rows.find(s => s.row.kind === 'rail')!; if (slot.row.kind !== 'rail') throw new Error('fixture');
  const sound = new BoxingSound(), cues: string[] = []; sound.play = cue => { cues.push(cue); };
  const audio = new RailSound(), row = slot.row;
  const warning = row.period - row.phase - .4 + row.period;
  audio.update([slot], slot.z - 1, warning, sound); audio.update([slot], slot.z - 1, warning + .1, sound);
  expect(cues).toEqual(['horn', 'bell']);
  audio.update([slot], slot.z - 1, warning + 1, sound);
  audio.update([slot], slot.z - 1, warning + row.period, sound);
  expect(cues.filter(c => c === 'horn')).toHaveLength(2);
  audio.reset(); audio.update([slot], slot.z - 1, warning, sound);
  expect(cues.filter(c => c === 'horn')).toHaveLength(3);
});
