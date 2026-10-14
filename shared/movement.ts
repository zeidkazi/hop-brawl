import { CONFIG, SOLO, scrollSpeed } from './config';
import { carriedOffEdge, hopHazardPosition, logAtLanding, trainHits, vehicleHits } from './hazards';
import type { Row } from './types';

export type HopDirection = 'up' | 'down' | 'left' | 'right';
export type DeathCause = 'FLATTENED!' | 'DERAILED!' | 'SPLASH!' | 'SWEPT AWAY!' | 'LEFT BEHIND!';
const DX = { up: 0, down: 0, left: -1, right: 1 } as const;
const DZ = { up: 1, down: -1, left: 0, right: 0 } as const;

/** Shared allocation-free hop/hazard rules. Row descriptors are supplied by the recycled world cache. */
export class Movement {
  x: number = SOLO.SPAWN_X; z: number = SOLO.SPAWN_Z;
  fromX = this.x; fromZ = this.z; toX = this.x; toZ = this.z;
  time = 0; hopStart = 0; camZ = 0; distance = 0; hops = 0;
  hopping = false; onLog = false; dead: DeathCause | null = null;
  direction: HopDirection = 'up';
  buffered: HopDirection | null = null;
  onHop: (() => void) | null = null;
  onLand: (() => void) | null = null;
  onBonk: ((direction: HopDirection) => void) | null = null;
  onDeath: ((cause: DeathCause) => void) | null = null;
  private readonly hazard = { x: 0, z: 0 };
  constructor(readonly rowAt: (z: number) => Row) {}
  reset(): void {
    this.x = this.fromX = this.toX = SOLO.SPAWN_X;
    this.z = this.fromZ = this.toZ = SOLO.SPAWN_Z;
    this.time = this.hopStart = this.camZ = this.distance = this.hops = 0;
    this.hopping = this.onLog = false; this.dead = null; this.buffered = null; this.direction = 'up';
  }
  private blocked(x: number, z: number): boolean {
    if (x < 0 || x > CONFIG.COLUMNS - 1 || z > this.camZ + CONFIG.TOP_LIMIT_ROWS) return true;
    const row = this.rowAt(z);
    if (row.kind === 'grass') for (const obstacle of row.obstacles) if (obstacle.column === x) return true;
    return false;
  }
  input(direction: HopDirection): boolean {
    if (this.dead) return false;
    if (this.hopping) { this.buffered ??= direction; return false; }
    let x = this.x + DX[direction];
    const z = this.z + DZ[direction];
    const destination = this.rowAt(z);
    if (this.onLog && destination.kind !== 'river') {
      const nearest = Math.round(x);
      const other = x < nearest ? Math.floor(x) : Math.ceil(x);
      x = !this.blocked(nearest, z) ? nearest : other;
    }
    const column = destination.kind === 'river' ? Math.round(x) : x;
    if (this.blocked(column, z)) { this.onBonk?.(direction); return false; }
    this.direction = direction;
    this.fromX = this.x; this.fromZ = this.z; this.toX = x; this.toZ = z;
    this.hopStart = this.time; this.hopping = true; this.onLog = false; this.buffered = null;
    this.onHop?.(); return true;
  }
  /** Fixed small collision steps, sampled from absolute round time: a long frame cannot tunnel through traffic. */
  advance(targetSeconds: number): void {
    while (!this.dead && this.time < targetSeconds) {
      const next = Math.min(targetSeconds, this.time + SOLO.PHYSICS_STEP_MS / 1000);
      const dt = next - this.time; this.time = next;
      if (this.hopping) {
        const elapsed = (this.time - this.hopStart) * 1000;
        const p = Math.min(1, elapsed / CONFIG.HOP_MS);
        this.x = this.fromX + (this.toX - this.fromX) * p;
        this.z = this.fromZ + (this.toZ - this.fromZ) * p;
        if (p >= 1 - Number.EPSILON * 16) {
          this.x = this.toX; this.z = this.toZ; this.hopping = false;
          const row = this.rowAt(this.z);
          if (row.kind === 'river') {
            this.onLog = logAtLanding(row, this.x, this.time) >= 0;
            if (!this.onLog) { this.kill('SPLASH!'); break; }
          }
          this.distance = Math.max(this.distance, this.z); this.hops++; this.onLand?.();
        }
        hopHazardPosition(this.fromX, this.fromZ, this.toX, this.toZ, elapsed, this.hazard);
      } else {
        const row = this.rowAt(this.z);
        if (this.onLog && row.kind === 'river') this.x += row.direction * row.speed * dt;
        this.hazard.x = this.x; this.hazard.z = this.z;
      }
      const row = this.rowAt(this.hazard.z);
      if (row.kind === 'road' && vehicleHits(row, this.hazard.x, this.time)) this.kill('FLATTENED!');
      else if (row.kind === 'rail' && trainHits(row, this.hazard.x, this.time)) this.kill('DERAILED!');
      else if (this.onLog && carriedOffEdge(this.x)) this.kill('SWEPT AWAY!');
      const auto = this.camZ + scrollSpeed(this.time) * dt;
      const follow = Math.min(this.z - CONFIG.LEADER_MAX_AHEAD_ROWS, this.camZ + CONFIG.CAMERA_MAX_SPEED * dt);
      this.camZ = Math.max(auto, follow);
      if (this.hazard.z < this.camZ) this.kill('LEFT BEHIND!');
      if (!this.hopping && !this.dead && this.buffered) {
        const queued = this.buffered; this.buffered = null; this.input(queued);
      }
    }
  }
  private kill(cause: DeathCause): void {
    if (this.dead) return;
    this.dead = cause; this.buffered = null; this.onDeath?.(cause);
  }
}
