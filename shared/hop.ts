import { CONFIG, SOLO } from './config';
import type { MovementState } from './movement';
import { logSlotX } from './hazards';
import type { Row } from './types';

export const ease = (t: number): number => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function hopTravel(elapsedMs: number): number {
  return ease((elapsedMs - SOLO.ANTICIPATION_MS) / (CONFIG.HOP_MS - SOLO.ANTICIPATION_MS - SOLO.LANDING_MS));
}
export function hopX(from: number, aim: number, to: number, travel: number): number {
  // Bend progressively toward the future slot, with zero velocity at both ends.
  return from + (aim - from) * travel + (to - aim) * travel * travel;
}
export function createHopPose() { return { x: 0, z: 0, y: 0, sx: 1, sy: 1, roll: 0, hopping: false }; }
export type HopPose = ReturnType<typeof createHopPose>;
/** The same timestamped curve for predicted, solo and delayed remote rendering. No snapshot sliding. */
export function sampleHop(state: MovementState, time: number, rowAt: (z: number) => Row, out: HopPose): void {
  const ms = (time - state.hopStart) * 1000;
  out.x = state.x; out.z = state.z; out.y = state.onLog ? SOLO.LOG_TOP : 0;
  out.sx = out.sy = 1; out.roll = 0;
  out.hopping = !state.dead && ms >= 0 && ms < CONFIG.HOP_MS && (state.hopping || state.hops > 0);
  if (out.hopping) {
    const p = hopTravel(ms);
    out.x = hopX(state.fromX, state.aimX, state.toX, p);
    out.z = state.fromZ + (state.toZ - state.fromZ) * p;
    const from = rowAt(state.fromZ).kind === 'river' ? SOLO.LOG_TOP : 0;
    const to = rowAt(state.toZ).kind === 'river' ? SOLO.LOG_TOP : 0;
    out.y = from + (to - from) * p + Math.sin(p * Math.PI) * SOLO.HOP_HEIGHT;
    if (ms < SOLO.ANTICIPATION_MS) out.sy = 1 - (1 - SOLO.SQUASH_Y) * Math.sin(Math.PI * ms / SOLO.ANTICIPATION_MS);
    else if (ms < CONFIG.HOP_MS - SOLO.LANDING_MS) out.sy = 1 + (SOLO.STRETCH_Y - 1) * Math.sin(p * Math.PI);
    else out.sy = 1 - (1 - SOLO.SQUASH_Y) * Math.sin(Math.PI * (ms - CONFIG.HOP_MS + SOLO.LANDING_MS) / SOLO.LANDING_MS);
    out.sx = 1 + (1 - out.sy) * (SOLO.SQUASH_XZ - 1) / (1 - SOLO.SQUASH_Y);
  } else if (state.hopping && !state.dead && ms >= CONFIG.HOP_MS) {
    // A delayed snapshot can still be mid-flight after its visual hop has ended.
    // Hold the destination until confirmation, never the fractional sampled row.
    out.x = state.toX; out.z = state.toZ;
    out.y = rowAt(state.toZ).kind === 'river' ? SOLO.LOG_TOP : 0;
  } else if (state.onLog && !state.dead) {
    const row = rowAt(state.z);
    if (row.kind === 'river') out.x = logSlotX(row, state.logIndex, state.slotIndex, time);
    out.roll = Math.sin(time * SOLO.LOG_SWAY_HZ * Math.PI * 2) * SOLO.LOG_SWAY;
  }
}
