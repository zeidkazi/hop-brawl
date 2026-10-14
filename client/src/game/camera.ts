import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CONFIG, HOME, VIEW } from '../../../shared/config';

export type Station = 'home' | 'lobby' | 'search' | 'vs' | 'gameplay' | 'roundEnd' | 'matchEnd' | 'soloEnd';
export const STATIONS: readonly Station[] = ['home', 'lobby', 'search', 'vs', 'gameplay', 'roundEnd', 'matchEnd', 'soloEnd'];
const pitch = MathUtils.degToRad(VIEW.PITCH_DEG);
const yaw = MathUtils.degToRad(VIEW.YAW_DEG);
const back = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
const up = new Vector3().crossVectors(back, right);

/** Exact perspective fit of the four gameplay corners at the fixed viewing angle. */
export function gameplayDistance(aspect: number): number {
  const tangent = Math.tan(MathUtils.degToRad(VIEW.FOV / 2)) / VIEW.FIT_MARGIN;
  let distance = 0;
  for (let corner = 0; corner < 4; corner++) {
    const x = (corner & 1 ? 1 : -1) * CONFIG.COLUMNS / 2;
    const z = (corner & 2 ? 1 : -1) * CONFIG.VIEW_ROWS / 2;
    const depth = x * back.x + z * back.z;
    distance = Math.max(distance, Math.abs(x * right.x + z * right.z) / (tangent * aspect) + depth,
      Math.abs(x * up.x + z * up.z) / tangent + depth);
  }
  return distance;
}

export class CameraRig {
  readonly camera = new PerspectiveCamera(VIEW.FOV, 1, VIEW.NEAR, VIEW.FAR);
  station: Station = 'home';
  reducedMotion = false;
  camZ = 0;
  targetCamZ = 0;
  private velocity = 0;
  private aspect = 1;
  private readonly focus = new Vector3();
  private readonly fromFocus = new Vector3();
  private readonly goalFocus = new Vector3();
  private readonly goal = new Vector3();
  private readonly points = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  private readonly path = new CatmullRomCurve3(this.points);
  private flight = 1;
  private drift = 0;

  constructor(aspect: number) {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.destination();
    this.camera.position.copy(this.goal);
    this.focus.copy(this.goalFocus);
    this.camera.lookAt(this.focus);
    this.camera.updateProjectionMatrix();
  }

  resize(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.go(this.station);
    if (this.station === 'home') {
      this.camera.position.copy(this.goal); this.focus.copy(this.goalFocus);
      this.camera.lookAt(this.focus); this.flight = 1;
    }
  }

  go(station: Station): void {
    this.station = station;
    this.drift = 0;
    if (station === 'soloEnd') { this.flight = 1; return; }
    this.destination();
    this.fromFocus.copy(this.focus);
    this.points[0]!.copy(this.camera.position);
    this.points[3]!.copy(this.goal);
    this.points[1]!.lerpVectors(this.points[0]!, this.goal, 1 / 3);
    this.points[2]!.lerpVectors(this.points[0]!, this.goal, 2 / 3);
    this.flight = 0;
  }

  resetScroll(snap = false): void {
    this.camZ = this.targetCamZ = this.velocity = 0;
    if (snap) {
      this.station = 'gameplay'; this.destination(); this.camera.position.copy(this.goal);
      this.focus.copy(this.goalFocus); this.camera.lookAt(this.focus); this.flight = 1;
    }
  }

  private destination(): void {
    const baseDistance = this.station === 'gameplay' ? gameplayDistance(this.aspect)
      : this.station === 'lobby' ? VIEW.LOBBY_DISTANCE
        : this.station === 'search' ? VIEW.SEARCH_DISTANCE
          : this.station === 'vs' ? VIEW.VS_DISTANCE
            : this.station === 'roundEnd' ? VIEW.WINNER_DISTANCE : HOME.DISTANCE;
    const distance = this.station === 'gameplay' ? baseDistance : baseDistance * Math.max(1, HOME.PORTRAIT_FIT / this.aspect);
    this.goalFocus.set(this.station === 'matchEnd' ? VIEW.PODIUM_X : 4,
      this.station === 'home' ? HOME.FOCUS_Y : 0,
      this.station === 'gameplay' ? -this.camZ - (CONFIG.VIEW_ROWS - 1) / 2 : -1);
    this.goal.copy(back).multiplyScalar(distance).add(this.goalFocus);
  }

  update(dt: number, time: number): void {
    // Analytic critically damped spring: no overshoot or frame-rate-dependent lerp.
    const error = this.camZ - this.targetCamZ;
    const omega = VIEW.RESIZE_SPRING;
    const decay = Math.exp(-omega * dt);
    const term = (this.velocity + omega * error) * dt;
    const next = this.targetCamZ + (error + term) * decay;
    this.velocity = (this.velocity - omega * term) * decay;
    const shift = next - this.camZ;
    this.camZ = next;
    if (this.station === 'gameplay') {
      this.camera.position.z -= shift;
      this.focus.z -= shift;
      for (let i = 0; i < this.points.length; i++) this.points[i]!.z -= shift;
      this.fromFocus.z -= shift;
      this.goalFocus.z -= shift;
    }
    if (this.flight < 1) {
      this.flight = Math.min(1, this.flight + dt * 1000 / CONFIG.CAMERA_FLIGHT_MS);
      const t = this.flight;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.path.getPoint(eased, this.camera.position);
      this.focus.lerpVectors(this.fromFocus, this.goalFocus, eased);
    } else if (!this.reducedMotion && (this.station === 'home' || this.station === 'search' || this.station === 'roundEnd')) {
      const drift = Math.sin(time / VIEW.HOME_DISTANCE) * VIEW.MENU_DRIFT;
      this.camera.position.x += drift - this.drift;
      this.drift = drift;
    }
    this.camera.lookAt(this.focus);
  }
}
