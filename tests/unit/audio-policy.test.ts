import { expect, it } from 'vitest';
import { spatial, voiceToSteal } from '../../client/src/game/audio-policy';
import type { Voice } from '../../client/src/game/audio-policy';
import manifest from '../../client/src/game/audio-manifest.json';
const voices = (n: number): Voice[] => Array.from({ length: n }, (_, id) => ({ id, priority: 2, level: 1, loop: false, key: '' }));
it('reserves two music voices and protects warnings/player feedback from ambient eviction', () => {
  expect(voiceToSteal(voices(13), 2, false)).toBeNull();
  expect(voiceToSteal(voices(14), 0, true)).toBe(-1);
  const full = voices(14); full[7]!.priority = 0;
  expect(voiceToSteal(full, 3, false)).toBe(7);
  expect(voiceToSteal(voices(8).map(v => ({ ...v, loop: true })), 0, true)).toBe(-1);
});
it('attenuates beyond three rows and pans relative to player position', () => {
  expect(spatial(4, 5, 4, 5)).toEqual({ pan: 0, level: 1 });
  expect(spatial(4, 8, 4, 5).level).toBe(0);
  expect(spatial(3, 5, 4, 5).pan).toBeLessThan(0); expect(spatial(5, 5, 4, 5).pan).toBeGreaterThan(0);
});
it('exports complete finite sprites, specified sting durations and exact eight-bar loops', () => {
  expect(Object.keys(manifest.sfx)).toHaveLength(44);
  expect(manifest.sfx.roundWin[1]).toBe(2500); expect(manifest.sfx.matchWin[1]).toBe(5000); expect(manifest.sfx.gameOver[1]).toBe(2000);
  for (const [name, sprite] of Object.entries(manifest.music)) {
    expect(sprite[2]).toBe(true); expect(sprite[1]).toBeCloseTo(32 * 60 / (name === 'menu' ? 110 : 130) * 1000, 1);
  }
});
