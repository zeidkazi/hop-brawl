import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CONFIG, HOME, RAIL, VIEW } from '../../../shared/config';
import { gameplayAnchor, gameplayDistance } from '../../../shared/camera';
export { gameplayDistance } from '../../../shared/camera';

export type Station = 'home' | 'lobby' | 'search' | 'vs' | 'gameplay' | 'roundEnd' | 'matchEnd' | 'soloEnd';
export const STATIONS: readonly Station[] = ['home', 'lobby', 'search', 'vs', 'gameplay', 'roundEnd', 'matchEnd', 'soloEnd'];
const pitch = MathUtils.degToRad(VIEW.PITCH_DEG);
const yaw = MathUtils.degToRad(VIEW.YAW_DEG);
const back = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
const gamePitch = MathUtils.degToRad(VIEW.GAME_PITCH_DEG), gameYaw = MathUtils.degToRad(VIEW.GAME_YAW_DEG);
const gameplayBack = new Vector3(Math.sin(gameYaw) * Math.cos(gamePitch), Math.sin(gamePitch), Math.cos(gameYaw) * Math.cos(gamePitch));

export class CameraRig {
  readonly camera = new PerspectiveCamera(VIEW.FOV, 1, VIEW.NEAR, VIEW.FAR);
  station: Station = 'home';
  reducedMotion = false;
  camZ = 0;
  targetCamZ = 0;
  leaderZ = 1;
  shake = 0;
  private shakeOffset = 0;
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
  private readonly projected = new Vector3();

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
    this.camera.position.x -= this.shakeOffset; this.shakeOffset = 0;
    this.station = station;
    this.drift = 0;
    if (station === 'soloEnd') { this.flight = 1; return; }
    this.camera.updateProjectionMatrix();
    this.destination();
    this.fromFocus.copy(this.focus);
    this.points[0]!.copy(this.camera.position);
    this.points[3]!.copy(this.goal);
    this.points[1]!.lerpVectors(this.points[0]!, this.goal, 1 / 3);
    this.points[2]!.lerpVectors(this.points[0]!, this.goal, 2 / 3);
    this.flight = 0;
  }

  resetScroll(snap = false): void {
    this.camera.position.x -= this.shakeOffset; this.shakeOffset = 0; this.shake = 0;
    this.camZ = this.targetCamZ = this.velocity = 0;
    this.leaderZ = 1;
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
      this.station === 'gameplay' ? -gameplayAnchor(this.camZ, this.leaderZ) : -1);
    this.goal.copy(this.station === 'gameplay' ? gameplayBack : back).multiplyScalar(distance).add(this.goalFocus);
  }

  update(dt: number, time: number): void {
    this.camera.position.x -= this.shakeOffset; this.shakeOffset = 0;
    // Analytic critically damped spring: no overshoot or frame-rate-dependent lerp.
    const error = this.camZ - this.targetCamZ;
    const omega = VIEW.RESIZE_SPRING;
    const decay = Math.exp(-omega * dt);
    const term = (this.velocity + omega * error) * dt;
    const spring = this.targetCamZ + (error + term) * decay;
    // Keep the authoritative screen-bottom death line within §30's 0.05-tile bound.
    const next = this.station === 'gameplay' ? Math.max(this.targetCamZ - VIEW.FOLLOW_MAX_LAG, Math.min(this.targetCamZ, spring)) : spring;
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
    if (this.station === 'gameplay' && this.flight === 1) {
      this.destination(); this.camera.position.copy(this.goal); this.focus.copy(this.goalFocus);
    }
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
    if (this.station === 'gameplay' && this.flight === 1) {
      this.camera.projectionMatrix.elements[9] = VIEW.GAME_PLAYER_Y * 2 - 1;
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    }
    if ((this.station === 'gameplay' || this.station === 'soloEnd') && !this.reducedMotion && this.shake) {
      this.shakeOffset = Math.sin(time * Math.PI * 2 * RAIL.SHAKE_HZ) * this.shake;
      this.camera.position.x += this.shakeOffset; this.camera.updateMatrixWorld();
    }
  }
  screenY(x: number, z: number, camZ = this.camZ): number {
    this.projected.set(x, 0, -z + camZ - this.camZ).project(this.camera);
    return (1 - this.projected.y) / 2;
  }
}
