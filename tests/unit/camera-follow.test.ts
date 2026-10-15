import { expect, it } from 'vitest';
import { CameraRig } from '../../client/src/game/camera';
import { Movement } from '../../shared/movement';
import { generateRow } from '../../shared/worldgen';
import { VIEW } from '../../shared/config';
it.each([30, 60, 120])('keeps 20 rapid hops smooth at %s fps without following height or x', fps => {
  const rig = new CameraRig(390 / 844); rig.resetScroll(true);
  const move = new Movement(z => ({ ...generateRow(42, 0), z })); move.belowScreen = () => false;
  const positions: number[] = [], x = rig.camera.position.x, y = rig.camera.position.y;
  let time = 0;
  while (move.hops < 20) {
    if (!move.hopping && move.hops < 20) move.input('up');
    time += 1 / fps; move.advance(time);
    rig.targetCamZ = move.camZ; rig.leaderZ = move.z; rig.update(1 / fps, time);
    positions.push(rig.camera.position.z);
    expect(rig.camera.position.x).toBe(x); expect(rig.camera.position.y).toBe(y);
  }
  const steps = positions.slice(1).map((z, i) => Math.abs(z - positions[i]!)).sort((a,b) => a-b);
  expect(Math.max(...steps)).toBeLessThanOrEqual(2 * steps[Math.floor(steps.length / 2)]!);
});
it('uses the same time response at different frame rates and caps shake at .1 tile', () => {
  const values = [30,60,120].map(fps => {
    const rig = new CameraRig(1.6); rig.resetScroll(true); rig.targetCamZ = 10; rig.leaderZ = 11;
    for (let i = 0; i < fps; i++) rig.update(1 / fps, i / fps);
    return rig.camera.position.z;
  });
  expect(values[0]).toBeCloseTo(values[1]!, 10); expect(values[1]).toBeCloseTo(values[2]!, 10);
  const rig = new CameraRig(1.6); rig.resetScroll(true); const x = rig.camera.position.x;
  rig.shake = 10; rig.update(0, 1 / 120); expect(Math.abs(rig.camera.position.x - x)).toBeLessThanOrEqual(VIEW.SHAKE_MAX_TILES + 1e-10);
});
