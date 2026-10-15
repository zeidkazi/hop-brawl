import { SOUND } from '../../../shared/config';
export type Voice = { id: number; priority: number; level: number; loop: boolean; key: string };
/** Ambient loops cannot evict player feedback or warnings; two slots remain for music crossfades. */
export function voiceToSteal(voices: readonly Voice[], priority: number, loop: boolean): number | null {
  const ambient = voices.filter(v => v.loop);
  if (loop && ambient.length >= SOUND.AMBIENT_MAX_VOICES) return -1;
  if (voices.length < SOUND.MAX_VOICES - SOUND.MUSIC_RESERVED_VOICES) return null;
  const candidate = voices.reduce<Voice | undefined>((best, v) => !best || v.priority < best.priority || (v.priority === best.priority && v.level < best.level) ? v : best, undefined);
  return candidate && candidate.priority <= priority ? candidate.id : -1;
}
export function spatial(x: number, z: number, listenerX: number, listenerZ: number, reach: number = SOUND.AUDIBLE_ROWS) {
  const distance = Math.hypot((x - listenerX) / SOUND.PAN_TILES, (z - listenerZ) / reach);
  return { pan: Math.max(-1, Math.min(1, (x - listenerX) / SOUND.PAN_TILES)), level: Math.max(0, 1 - distance) };
}
