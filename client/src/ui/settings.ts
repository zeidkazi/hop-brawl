import { ANIMALS, STREET, VIEW } from '../../../shared/config';
import type { GraphicsChoice } from '../game/quality';

export interface Preferences {
  name: string;
  animal: number;
  music: number;
  sfx: number;
  haptics: boolean;
  reducedMotion: boolean;
  graphics: GraphicsChoice;
}
export const SETTINGS_KEY = 'hop-brawl-settings';
export function readPreferences(storage: Pick<Storage, 'getItem'>, reducedMotion = false): Preferences {
  const defaults: Preferences = { name: '', animal: STREET.DEFAULT_ANIMAL, music: VIEW.MUSIC_VOLUME, sfx: VIEW.SFX_VOLUME,
    haptics: true, reducedMotion, graphics: 'auto' };
  try {
    const raw: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return defaults;
    const value = raw as Record<string, unknown>;
    if (typeof value.name === 'string') defaults.name = value.name.trim().slice(0, VIEW.NAME_MAX_LENGTH);
    if (typeof value.animal === 'number' && Number.isInteger(value.animal) && value.animal >= 0 && value.animal < ANIMALS.length) defaults.animal = value.animal;
    for (const key of ['music', 'sfx'] as const) {
      if (typeof value[key] === 'number' && Number.isFinite(value[key])) defaults[key] = Math.max(0, Math.min(1, value[key]));
    }
    for (const key of ['haptics', 'reducedMotion'] as const) if (typeof value[key] === 'boolean') defaults[key] = value[key];
    if (value.graphics === 'auto' || value.graphics === 'high' || value.graphics === 'low') defaults.graphics = value.graphics;
  } catch { /* Private mode or corrupt storage: keep session defaults. */ }
  return defaults;
}
export function savePreferences(storage: Pick<Storage, 'setItem'>, value: Preferences): void {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(value)); } catch { /* Session settings still work. */ }
}
