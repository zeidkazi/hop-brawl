import { CONFIG } from './config';
import type { Row } from './types';
/** Whole footprints must lie on grass and outside the arena setback. */
export function grassSceneryAllowed(rowAt: (z: number) => Row | undefined, minX: number, maxX: number,
  minZ: number, maxZ: number, setback = 0): boolean {
  if (!(maxX <= -.5 - setback || minX >= CONFIG.COLUMNS - .5 + setback)) return false;
  for (let z = Math.floor(minZ + .5); z <= Math.floor(maxZ + .5); z++) if (rowAt(z)?.kind !== 'grass') return false;
  return true;
}
