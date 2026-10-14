import { readFileSync } from 'node:fs';
import { BackSide, BoxGeometry, InstancedMesh, Mesh, MeshBasicMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../shared/config';
import { Outlines, outlinedAt } from '../../client/src/game/outlines';

describe('Street Brawl assets and outlines', () => {
  it.each(ANIMALS)('%s exposes independently tintable gear', async name => {
    const bytes = readFileSync(`client/public/models/${name}.glb`);
    const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const finalGear = !!scene.getObjectByName(`${name}_glove_left_handle`);
    for (const part of finalGear ? ['glove_left', 'glove_right', 'cuff_left', 'cuff_right'] : ['glove_left', 'glove_right', 'headband_stripe', 'headband']) {
      const mesh = scene.getObjectByName(`${name}_${part}`) as Mesh;
      expect(mesh.isMesh).toBe(true);
      expect(mesh.userData.player_color === true).toBe(part.startsWith('glove_') || part === 'headband_stripe');
      expect(mesh.geometry.getAttribute('color')).toBeDefined();
    }
    if (finalGear) {
      expect(scene.getObjectByName(`${name}_headband`)).toBeUndefined();
      for (const side of ['left', 'right']) expect(scene.getObjectByName(`${name}_glove_${side}_handle`)!.children).toHaveLength(2);
    }
  });
  it('limits outline categories at each quality tier', () => {
    for (const kind of ['animal', 'vehicle', 'logo', 'prop'] as const) {
      expect(outlinedAt(kind, 'high')).toBe(true);
      expect(outlinedAt(kind, 'medium')).toBe(kind !== 'prop');
      expect(outlinedAt(kind, 'low')).toBe(kind === 'animal');
    }
  });
  it('shares instanced transforms, uses only back faces and never casts shadows', () => {
    const source = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 4);
    const outlines = new Outlines(); outlines.add(source, 'vehicle');
    const shell = outlines.entries[0]!.shell as InstancedMesh;
    expect(shell.instanceMatrix).toBe(source.instanceMatrix);
    expect(outlines.material.side).toBe(BackSide); expect(shell.castShadow).toBe(false);
    source.count = 2; outlines.sync(); expect(shell.count).toBe(2);
    outlines.applyTier('low'); expect(shell.visible).toBe(false);
  });
});
