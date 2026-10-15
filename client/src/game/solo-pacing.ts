import { FEEL } from '../../../shared/config';
/** Solo-only pressure clock. Sideways hops and retreat cannot reset the forward-progress deadline. */
export class SoloPacing {
  camZ = 0; warning = false; expired = false; idle = 0;
  private furthest = 1; private progressed = 0; private started = false;
  reset(): void { this.camZ = this.idle = this.progressed = 0; this.furthest = 1; this.started = this.warning = this.expired = false; }
  update(time: number, z: number, firstHopAt: number | null): void {
    if (firstHopAt === null) return;
    if (!this.started) { this.started = true; this.progressed = firstHopAt; }
    if (z > this.furthest) { this.furthest = z; this.progressed = time; }
    this.idle = Math.max(0, time - this.progressed);
    this.warning = this.idle >= FEEL.IDLE_WARNING_S; this.expired = this.idle >= FEEL.IDLE_DEATH_S;
    this.camZ = Math.max(0, z - 1) + this.idle * Math.min(FEEL.SOLO_DRIFT, FEEL.SOLO_DRIFT_MAX);
  }
}
