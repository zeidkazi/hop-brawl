import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import { CameraRig } from '../../client/src/game/camera';
import { Movement } from '../../shared/movement';
import { advanceCamera, initialCamZ, soloDrift } from '../../shared/camera';
import { VIEW } from '../../shared/config';
const records: object[] = [];
afterAll(() => { mkdirSync('tmp', { recursive: true }); writeFileSync('tmp/feel7-camera-motion.json', JSON.stringify(records)); });
const grass = (z: number) => ({ kind: 'grass' as const, z, biome: 'meadow' as const, obstacles: [], crate: null });
for (const fps of [30, 60]) for (const pattern of ['rapid', 'slow', 'back-and-forth', 'sideways']) {
  it(`records ${pattern} camera motion at ${fps}fps without lean or reverse motion`, () => {
    const rig = new CameraRig(390 / 844); rig.resetScroll(true);
    const move = new Movement(grass); move.externalCamera = true; move.belowScreen = () => false;
    let edge = initialCamZ(390 / 844), time = 0, nextHop = 0, accepted = 0;
    const limit = pattern === 'back-and-forth' ? 10 : 30, interval = pattern === 'slow' ? .5 : .12;
    const x = rig.camera.position.x, y = rig.camera.position.y, positions = [rig.camZ], anchors = [rig.camera.position.z], targets = [edge];
    let finished = Infinity;
    while (time < finished + 3 && time < 60) {
      move.camZ = edge;
      if (time >= nextHop && !move.hopping && accepted < limit) {
        const direction = pattern === 'sideways' ? accepted % 2 ? 'left' : 'right'
          : pattern === 'back-and-forth' && accepted % 2 ? 'down' : 'up';
        if (move.input(direction)) { accepted++; nextHop = time + interval; }
      }
      time += 1 / fps; move.advance(time);
      if (move.hops === limit && finished === Infinity) finished = time;
      edge = advanceCamera(edge, move.z, soloDrift(time), 1 / fps);
      rig.targetCamZ = edge; rig.leaderZ = move.z; rig.update(1 / fps, time);
      positions.push(rig.camZ); anchors.push(rig.camera.position.z); targets.push(edge);
      expect(rig.camera.position.x).toBe(x); expect(rig.camera.position.y).toBe(y);
    }
    expect(move.hops).toBe(limit);
    const steps = positions.slice(1).map((z, i) => z - positions[i]!);
    const acceleration = steps.slice(1).map((step, i) => Math.abs(step - steps[i]!));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...acceleration)).toBeLessThanOrEqual(.02);
    // Owner clarification: the ratio applies only after a target has maintained a
    // steady speed for three spring time constants. Acceleration covers every frame above.
    const speeds = targets.slice(1).map((target, i) => (target - targets[i]!) * fps);
    const window = Math.ceil(.75 * fps), block = Math.ceil(.25 * fps), ratios: number[] = [];
    let steady: number[] = [];
    for (let i = window; i < steps.length; i++) {
      const recent = speeds.slice(i - window, i + 1);
      if (Math.max(...recent) - Math.min(...recent) <= .01) steady.push(steps[i]!); else steady = [];
      if (steady.length === block) {
        const sorted = [...steady].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)]!;
        ratios.push(Math.max(...steady) / median); steady = [];
      }
    }
    expect(ratios.length).toBeGreaterThan(0);
    expect(Math.max(...ratios)).toBeLessThanOrEqual(1.3);
    records.push({ fps, pattern, hops: limit, maxAcceleration: Math.max(...acceleration), maxSteadyRatio: Math.max(...ratios), steadyWindows: ratios.length, positions, anchors, targets });
  });
}
it('caps even excessive shake at .08 tiles', () => {
  const rig = new CameraRig(1.6); rig.resetScroll(true); const x = rig.camera.position.x;
  rig.shake = 10; rig.update(1 / 60, 1 / 120); expect(Math.abs(rig.camera.position.x - x)).toBeLessThanOrEqual(VIEW.SHAKE_MAX_TILES);
});
