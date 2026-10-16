import { CAMERA, CONFIG, FEEL, ROOM, SOLO, VIEW } from './config';
const pitch = VIEW.GAME_PITCH_DEG * Math.PI / 180, yaw = VIEW.GAME_YAW_DEG * Math.PI / 180;
const tangent = Math.tan(VIEW.FOV * Math.PI / 360);
export function gameplayDistance(aspect: number): number {
  return aspect < 1 ? CONFIG.COLUMNS * Math.cos(yaw) / (2 * tangent * aspect * VIEW.GAME_WIDTH_RATIO) : VIEW.GAME_DISTANCE;
}
export function gameplayAnchor(camZ: number, _leaderZ: number, aspect: number = ROOM.DEFAULT_ASPECT): number {
  return camZ + bottomOffset(4, aspect);
}
/** Same projection on server and client; no Three.js dependency in the Worker. */
export function gameplayScreenY(x: number, z: number, camZ: number, leaderZ: number, aspect: number): number {
  const dx = x - (CONFIG.COLUMNS - 1) / 2, dz = gameplayAnchor(camZ, leaderZ, aspect) - z;
  const depth = gameplayDistance(aspect) - Math.sin(yaw) * Math.cos(pitch) * dx - Math.cos(yaw) * Math.cos(pitch) * dz;
  const up = -Math.sin(yaw) * Math.sin(pitch) * dx - Math.cos(yaw) * Math.sin(pitch) * dz;
  return VIEW.GAME_PLAYER_Y - up / (2 * tangent * depth);
}

/** Ground-plane intersection of the bottom screen edge, accounting for the angled camera. */
export function bottomOffset(x: number, aspect: number): number {
  const k = 2 * tangent * (1 - VIEW.GAME_PLAYER_Y);
  return (k * gameplayDistance(aspect) / (Math.sin(pitch) + k * Math.cos(pitch))
    - Math.sin(yaw) * (x - (CONFIG.COLUMNS - 1) / 2)) / Math.cos(yaw);
}
export function initialCamZ(aspect: number = ROOM.DEFAULT_ASPECT): number { return SOLO.SPAWN_Z - bottomOffset(4, aspect); }
export function bottomAt(camZ: number, x: number, aspect: number): number { return camZ + bottomOffset(4, aspect) - bottomOffset(x, aspect); }
export function advanceCamera(camZ: number, leader: number, speed: number, dt: number): number {
  return Math.min(camZ + CONFIG.CAMERA_MAX_SPEED * dt, Math.max(camZ, camZ + speed * dt, leader - CONFIG.LEADER_MAX_AHEAD_ROWS));
}
export function soloDrift(elapsed: number): number { return Math.min(CAMERA.SOLO_DRIFT + CAMERA.SOLO_ACCELERATION * elapsed, CAMERA.SOLO_MAX_DRIFT); }
/** Exact critically damped solution for a constant target, with SmoothDamp's maximum-distance clamp. */
export class CameraSpring {
  value = 0; velocity = 0;
  reset(value: number): void { this.value = value; this.velocity = 0; }
  update(target: number, dt: number): number {
    if (dt <= 0) return this.value;
    const omega = 2 / CAMERA.SMOOTH_TIME_S;
    const change = Math.max(-CAMERA.SPRING_MAX_SPEED * CAMERA.SMOOTH_TIME_S, Math.min(0, this.value - target));
    const limited = this.value - change, decay = Math.exp(-omega * dt);
    const temp = (this.velocity + omega * change) * dt;
    this.velocity = Math.max(0, (this.velocity - omega * temp) * decay);
    this.value = Math.max(this.value, Math.min(target, limited + (change + temp) * decay));
    return this.value;
  }
}
/** Warning lifetime belongs to a life, and survives authoritative movement snapshots. */
export function warningLevel(distance: number): number {
  return distance > CAMERA.DANGER_ROWS ? 0 : CAMERA.DANGER_MIN_ALPHA + (CAMERA.DANGER_MAX_ALPHA - CAMERA.DANGER_MIN_ALPHA)
    * Math.max(0, Math.min(1, (CAMERA.DANGER_ROWS - distance) / (CAMERA.DANGER_ROWS - CAMERA.DANGER_FULL_ROWS)));
}
export function impactElapsed(elapsed: number, reduced = false): number {
  const slow = reduced ? 0 : Math.min(Math.max(0, elapsed), FEEL.HITSTOP_MS / 1000);
  return elapsed - slow * (1 - CAMERA.IMPACT_RATE);
}
