import { CONFIG } from './config';
import type { SlowMoWindow } from './types';

const NO_SLOW_MO: readonly SlowMoWindow[] = Object.freeze([]);

/** Create on a pickup event, never inside the render loop. Times are seconds. */
export function slowMoWindow(start: number): SlowMoWindow {
  return { start, end: start + CONFIG.SLOWMO_MS / 1000 };
}

/**
 * Integrate the union, not the sum, of slow windows in [0, t].
 * Handles unsorted/duplicate/nested windows without sorting or allocating.
 * Retain completed windows for the round: their accumulated offset persists.
 */
export function effectiveTime(t: number, windows: readonly SlowMoWindow[] = NO_SLOW_MO): number {
  let cursor = 0;
  let overlap = 0;
  while (cursor < t && windows.length > 0) {
    let coveredUntil = cursor;
    let nextStart = t;
    for (let i = 0; i < windows.length; i++) {
      const window = windows[i]!;
      if (window.end <= window.start || window.end <= cursor) continue;
      if (window.start <= cursor) {
        coveredUntil = Math.max(coveredUntil, Math.min(t, window.end));
      } else {
        nextStart = Math.min(nextStart, window.start);
      }
    }
    if (coveredUntil > cursor) {
      overlap += coveredUntil - cursor;
      cursor = coveredUntil;
    } else {
      cursor = nextStart;
    }
  }
  return t - (1 - CONFIG.SLOWMO_FACTOR) * overlap;
}
