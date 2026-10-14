import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CameraRig } from '../../client/src/game/camera';
import { Pool } from '../../client/src/game/pool';
import { WorldView } from '../../client/src/game/world-view';
import { CONFIG } from '../../shared/config';

describe('bounded pools', () => {
  it('reuses slots, refuses overflow and tolerates duplicate releases', () => {
    const pool = new Pool(2, index => ({ index }));
    const first = pool.acquire();
    const item = pool.items[first];
    pool.acquire();
    expect(pool.acquire()).toBe(-1);
    pool.release(first);
    pool.release(first);
    expect(pool.count).toBe(1);
    expect(pool.items[pool.acquire()]).toBe(item);
    expect(pool.count).toBe(2);
  });
  it('recycles distant row windows without losing bounds or allocating new meshes', () => {
    const view = new WorldView();
    const geometry = view.grounds[0]!.geometry;
    const slots = [...view.rows];
    view.prepareWindow(1000);
    expect(view.rows).toEqual(slots);
    expect(view.grounds[0]!.geometry).toBe(geometry);
    for (const mesh of view.grounds) expect(mesh.boundingSphere!.center.z).toBeLessThan(-1000);
    const generated = view.generatedRows;
    view.animalZ = 1001;
    view.update(20);
    expect(view.animals.boundingSphere!.center.z).toBe(-1001);
    expect(view.generatedRows).toBe(generated);
    view.applyTier('medium');
    expect(view.podium.castShadow).toBe(false);
    expect(view.vehicles.castShadow).toBe(true);
    view.applyTier('low');
    expect(view.vehicles.castShadow).toBe(false);
    expect(view.blobs.visible).toBe(true);
  });
});

describe('camera stations', () => {
  it.each([390 / 844, 1440 / 900, 844 / 390])('anchors the logical bottom to the rendered bottom at aspect %s', aspect => {
    const rig = new CameraRig(aspect);
    rig.go('gameplay');
    rig.update(0.7, 0.7);
    rig.camera.updateMatrixWorld();
    expect(rig.screenY(4, 0)).toBeCloseTo(1, 8);
    for (const x of [-0.5, 8.5]) for (const z of [0, -CONFIG.VIEW_ROWS]) {
      const projected = new Vector3(x, 0, z).project(rig.camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
    }
    rig.targetCamZ = 10; rig.update(1 / 60, 1);
    expect(rig.camZ).toBe(10); expect(rig.screenY(4, 10)).toBeCloseTo(1, 8);
  });
  it.each([390 / 844, 1440 / 900])('meets section 30 width framing at %s', aspect => {
    const rig = new CameraRig(aspect); rig.go('gameplay'); rig.update(.7, .7);
    const margin = aspect < 1 ? .5 : 0;
    const left = new Vector3(-.5 - margin, 0, -CONFIG.VIEW_ROWS / 2).project(rig.camera);
    const right = new Vector3(8.5 + margin, 0, -CONFIG.VIEW_ROWS / 2).project(rig.camera);
    expect((right.x - left.x) / 2).toBeGreaterThanOrEqual(aspect < 1 ? .92 : .45);
  });
  it('redirects flights from the current position without resetting the camera', () => {
    const rig = new CameraRig(1.6);
    const camera = rig.camera;
    rig.go('lobby');
    rig.update(0.25, 0.25);
    const before = camera.position.clone();
    rig.go('matchEnd');
    expect(camera.position.distanceTo(before)).toBe(0);
    rig.update(0.7, 1);
    expect(rig.camera).toBe(camera);
  });
});
