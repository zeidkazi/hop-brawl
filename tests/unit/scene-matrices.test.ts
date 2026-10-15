import { expect, it } from 'vitest';
import { Group, Object3D } from 'three';
import { updateVisibleMatrices } from '../../client/src/game/scene-matrices';
import { WorldView } from '../../client/src/game/world-view';
it('skips hidden rigs and catches up immediately when shown', () => {
  const root = new Group(), hidden = new Group(), leaf = new Object3D(); root.add(hidden); hidden.add(leaf);
  hidden.visible = false; root.position.x = 2; hidden.position.x = 3; leaf.position.x = 4;
  updateVisibleMatrices(root); expect(leaf.matrixWorld.elements[12]).toBe(0);
  hidden.visible = true; updateVisibleMatrices(root); expect(leaf.matrixWorld.elements[12]).toBe(9);
});
it('leaves static row and prop buffers untouched between recycled windows', () => {
  const world = new WorldView(); world.update(0);
  const ground = world.grounds[0]!.instanceMatrix.version, tree = world.trees.instanceMatrix.version;
  world.update(.016); world.update(.033);
  expect(world.grounds[0]!.instanceMatrix.version).toBe(ground); expect(world.trees.instanceMatrix.version).toBe(tree);
  expect(world.trees.matrixAutoUpdate).toBe(false);
  world.prepareWindow(50); world.update(1); expect(world.trees.instanceMatrix.version).toBeGreaterThan(tree);
  for (const tier of ['high', 'medium', 'low'] as const) { world.applyTier(tier); expect(world.trees.castShadow).toBe(false); expect(world.logs.castShadow).toBe(false); }
});
