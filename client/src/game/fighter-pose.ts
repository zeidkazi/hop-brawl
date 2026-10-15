import { SOLO } from '../../../shared/config';
import { ease } from '../../../shared/hop';
import type { DeathCause } from '../../../shared/movement';

export class Facing {
  value = 0; private from = 0; private target = 0; private started = 0;
  reset(): void { this.value = this.from = this.target = this.started = 0; }
  update(target: number, time: number): number {
    if (target !== this.target) { this.from = this.value; this.target = target; this.started = time; }
    const delta = Math.atan2(Math.sin(target - this.from), Math.cos(target - this.from));
    return this.value = this.from + delta * ease((time - this.started) * 1000 / SOLO.TURN_MS);
  }
}
export function createDeathPose() { return { x: 0, y: 0, roll: 0, sx: 1, sy: 1, opacity: 1 }; }
export function deathPose(cause: DeathCause, elapsed: number, side: number, reduced: boolean, out: ReturnType<typeof createDeathPose>): void {
  const t = Math.max(0, Math.min(1, elapsed * 1000 / SOLO.DEATH_MS)), p = ease(t);
  out.x = out.y = out.roll = 0; out.sx = out.sy = out.opacity = 1;
  if (cause === 'FLATTENED!') { out.sy = 1 - (1 - SOLO.FLATTEN_Y) * ease(t * SOLO.FLATTEN_RATE); out.sx = 1 + (1 - out.sy) * SOLO.FLATTEN_SPREAD; out.opacity = 1 - ease((elapsed - SOLO.PANCAKE_HOLD_S) / SOLO.PANCAKE_FADE_S); }
  else if (cause === 'SPLASH!') { out.y = -ease(elapsed / SOLO.SINK_S) * SOLO.SINK_DEPTH; }
  else if (cause === 'DERAILED!') { out.x = p * SOLO.TRAIN_FLING_X; out.y = Math.sin(p * Math.PI) * SOLO.TRAIN_FLING_Y; out.roll = reduced ? 0 : p * Math.PI * 2 * SOLO.TRAIN_SPINS; }
  else if (cause === 'SWEPT AWAY!') { out.x = side * p * SOLO.SWEPT_TRAVEL; out.roll = reduced ? 0 : Math.sin(t * SOLO.SWEPT_WOBBLE_RATE) * SOLO.SWEPT_WOBBLE; }
  else out.opacity = 1 - p;
}
export function respawnHeight(elapsed: number, reduced: boolean): number {
  const t = elapsed / SOLO.RESPAWN_DROP_S;
  if (t < 0 || t >= 1) return 0;
  if (reduced) return 0;
  if (t < SOLO.RESPAWN_CONTACT) return SOLO.RESPAWN_HEIGHT * (1 - ease(t / SOLO.RESPAWN_CONTACT));
  return Math.sin((t - SOLO.RESPAWN_CONTACT) / (1 - SOLO.RESPAWN_CONTACT) * Math.PI) * SOLO.RESPAWN_BOUNCE;
}
