import { expect, it } from 'vitest';
import { CameraRig } from '../../client/src/game/camera';
import { Movement } from '../../shared/movement';
import { advanceCamera, initialCamZ, soloDrift } from '../../shared/camera';
import { VIEW } from '../../shared/config';
const grass = (z: number) => ({ kind: 'grass' as const, z, biome: 'meadow' as const, obstacles: [], crate: null });
for (const fps of [30, 60]) for (const pattern of ['rapid', 'slow', 'back-and-forth', 'sideways']) {
  it(`records ${pattern} camera motion at ${fps}fps without lean or reverse motion`, () => {
    const rig = new CameraRig(390 / 844); rig.resetScroll(true);
    const move = new Movement(grass); move.externalCamera = true; move.belowScreen = () => false;
    let edge = initialCamZ(390 / 844), time = 0, nextHop = 0, accepted = 0;
    const limit = pattern === 'back-and-forth' ? 10 : 30, interval = pattern === 'slow' ? .5 : .12;
    const x = rig.camera.position.x, y = rig.camera.position.y, positions = [rig.camZ];
    while (move.hops < limit && time < 60) {
      move.camZ = edge;
      if (time >= nextHop && !move.hopping && accepted < limit) {
        const direction = pattern === 'sideways' ? accepted % 2 ? 'left' : 'right'
          : pattern === 'back-and-forth' && accepted % 2 ? 'down' : 'up';
        if (move.input(direction)) { accepted++; nextHop = time + interval; }
      }
      time += 1 / fps; move.advance(time);
      edge = advanceCamera(edge, move.z, soloDrift(time), 1 / fps);
      rig.targetCamZ = edge; rig.leaderZ = move.z; rig.update(1 / fps, time);
      positions.push(rig.camZ);
      expect(rig.camera.position.x).toBe(x); expect(rig.camera.position.y).toBe(y);
    }
    expect(move.hops).toBe(limit);
    const steps = positions.slice(1).map((z, i) => z - positions[i]!);
    const acceleration = steps.slice(1).map((step, i) => Math.abs(step - steps[i]!));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...acceleration)).toBeLessThanOrEqual(.02);
    const sorted = [...steps].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)]!;
    console.log(JSON.stringify({ fps, pattern, maxAcceleration: Math.max(...acceleration), maxStep: Math.max(...steps), median, ratio: Math.max(...steps) / median }));
  });
}
it('caps even excessive shake at .08 tiles', () => {
  const rig = new CameraRig(1.6); rig.resetScroll(true); const x = rig.camera.position.x;
  rig.shake = 10; rig.update(1 / 60, 1 / 120); expect(Math.abs(rig.camera.position.x - x)).toBeLessThanOrEqual(VIEW.SHAKE_MAX_TILES);
});
