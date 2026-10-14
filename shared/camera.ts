import { CONFIG, VIEW } from './config';
const pitch = VIEW.GAME_PITCH_DEG * Math.PI / 180, yaw = VIEW.GAME_YAW_DEG * Math.PI / 180;
const tangent = Math.tan(VIEW.FOV * Math.PI / 360);
export function gameplayDistance(aspect: number): number {
  return aspect < 1 ? CONFIG.COLUMNS * Math.cos(yaw) / (2 * tangent * aspect * VIEW.GAME_WIDTH_RATIO) : VIEW.GAME_DISTANCE;
}
export function gameplayAnchor(camZ: number, leaderZ: number): number {
  return Math.max(camZ + 1, Math.min(leaderZ, camZ + CONFIG.LEADER_MAX_AHEAD_ROWS));
}
/** Same projection on server and client; no Three.js dependency in the Worker. */
export function gameplayScreenY(x: number, z: number, camZ: number, leaderZ: number, aspect: number): number {
  const dx = x - (CONFIG.COLUMNS - 1) / 2, dz = gameplayAnchor(camZ, leaderZ) - z;
  const depth = gameplayDistance(aspect) - Math.sin(yaw) * Math.cos(pitch) * dx - Math.cos(yaw) * Math.cos(pitch) * dz;
  const up = -Math.sin(yaw) * Math.sin(pitch) * dx - Math.cos(yaw) * Math.sin(pitch) * dz;
  return VIEW.GAME_PLAYER_Y - up / (2 * tangent * depth);
}
