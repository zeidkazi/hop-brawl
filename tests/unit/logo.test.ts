import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Box3, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { ART } from '../../shared/config';

const folder = join(process.cwd(), 'art/variants');
const variants = existsSync(folder) ? readdirSync(folder).filter(name => name.endsWith('.glb')) : [];

describe('Lilita One logo candidates', () => {
  it.each(variants)('%s loads in the game loader with independent animation handles', async file => {
    const bytes = readFileSync(join(folder, file));
    expect(bytes.length).toBeLessThan(ART.LOGO_GLB_BUDGET);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    expect(doc.images ?? []).toHaveLength(0);
    expect(doc.textures ?? []).toHaveLength(0);
    expect(doc.extensionsRequired).toContain('KHR_mesh_quantization');
    expect(doc.extensionsUsed).not.toContain('KHR_draco_mesh_compression');
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const mascot = file === 'logo_street.glb' ? 'fox' : 'chicken';
    const names = ['logo_' + mascot];
    for (const line of ['HOP', 'BRAWL']) for (const letter of line) names.push(`logo_${line}_${letter}`);
    for (const name of names) {
      const node = gltf.scene.getObjectByName(name)!;
      expect(node, name).toBeDefined();
      expect(node.children.length).toBeGreaterThanOrEqual(2);
      expect(node.parent).toBe(gltf.scene);
      expect(new Box3().setFromObject(node).isEmpty()).toBe(false);
    }
    const chicken = gltf.scene.getObjectByName('logo_' + mascot)!;
    const o = gltf.scene.getObjectByName('logo_HOP_O')!;
    o.updateWorldMatrix(true, true);
    const perch = new Box3().setFromObject(o.getObjectByName('logo_HOP_O_face')!, true);
    expect(chicken.position.x).toBeCloseTo(o.position.x, 5);
    expect(chicken.position.y).toBeGreaterThan(perch.max.y - 0.01);
    expect(gltf.scene.getObjectByName(`logo_${mascot}_eyes`)).toBeDefined();
    for (const removed of ['glove', 'starburst', 'road_strip', 'dust_H']) expect(gltf.scene.getObjectByName(`logo_${removed}`)).toBeUndefined();
    gltf.scene.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const mat = node.material as MeshStandardMaterial;
      expect(mat.transparent).toBe(false);
      expect(mat.opacity).toBe(1);
      expect(mat.map).toBeNull();
      expect(node.geometry.attributes.color).toBeDefined();
      const normal = node.geometry.attributes.normal!;
      for (let i = 0; i < normal.count; i++) {
        const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
        // Three signed byte components each have at most 0.5 / 127 error.
        expect(Math.abs(length - 1)).toBeLessThanOrEqual(Math.sqrt(3) / 254);
      }
    });
    const name = file.slice(0, -4);
    const png = readFileSync(`art/previews/${name}.png`);
    expect(png.readUInt32BE(16)).toBe(ART.LOGO_REVIEW_WIDTH);
    expect(png.readUInt32BE(20)).toBe(ART.LOGO_REVIEW_HEIGHT);
    expect(statSync(`art/${name}.blend`).size).toBeGreaterThan(0);
    const manifest = JSON.parse(readFileSync(join(folder, `${name}.json`), 'utf8'));
    expect(manifest.font).toBe('Lilita One');
    expect(manifest.bytes).toBe(bytes.length);
    expect(manifest.letters).toHaveLength(8);
    for (const letter of manifest.letters) {
      expect(Math.abs(letter.tilt_deg)).toBeGreaterThanOrEqual(ART.LOGO_TILT_MIN_DEG);
      expect(Math.abs(letter.tilt_deg)).toBeLessThanOrEqual(ART.LOGO_TILT_MAX_DEG);
      expect(Math.abs(letter.height_nudge)).toBeLessThanOrEqual(letter.height * ART.LOGO_NUDGE_RATIO);
    }
  });
});
