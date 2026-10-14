import { describe, expect, it } from 'vitest';
import { readPreferences, savePreferences } from '../../client/src/ui/settings';

describe('session preferences', () => {
  it('handles denied and corrupt storage without preventing Home', () => {
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readPreferences(denied, true).reducedMotion).toBe(true);
    expect(readPreferences({ getItem: () => '{broken' }).graphics).toBe('auto');
    expect(() => savePreferences(denied, readPreferences(denied))).not.toThrow();
  });
  it('accepts only valid persisted values and bounds names and volumes', () => {
    const settings = readPreferences({ getItem: () => JSON.stringify({ name: '  abcdefghijklmnop ', animal: 30,
      music: 2, sfx: -1, haptics: 'false', reducedMotion: true, graphics: 'ultra' }) });
    expect(settings).toMatchObject({ name: 'abcdefghijkl', animal: 2, music: 1, sfx: 0, haptics: true, reducedMotion: true, graphics: 'auto' });
  });
});
