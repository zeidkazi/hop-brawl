import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART, VIEW } from '../../shared/config';

interface Gltf {
  asset: { version: string; generator: string };
  images?: unknown[]; textures?: unknown[]; extensionsUsed?: string[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number }[] }[];
  nodes: { name: string; mesh?: number; translation?: number[]; extras?: { part: string; ao_samples: number; ao_min: number; ao_max: number } }[];
  materials: { doubleSided?: boolean }[];
}
const modelDir = join(process.cwd(), 'client/public/models');
const models = existsSync(modelDir) ? readdirSync(modelDir).filter(file => file.endsWith('.glb')) : [];

describe('Blender deliverables', () => {
  it('keeps the complete model library below the shared byte budget', () => {
    expect(models.reduce((sum, file) => sum + statSync(join(modelDir, file)).size, 0)).toBeLessThan(ART.TOTAL_GLB_BUDGET);
  });
  it.each(models)('%s contains baked vertex colors, correctly scaled geometry and editable sources', file => {
    const name = file.slice(0, -4);
    const bytes = readFileSync(join(modelDir, file));
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as Gltf;
    expect(doc.asset.generator).toContain('Blender');
    expect(doc.images ?? []).toHaveLength(0);
    expect(doc.textures ?? []).toHaveLength(0);
    expect(doc.extensionsUsed ?? []).not.toContain('KHR_draco_mesh_compression');
    expect(doc.materials).toHaveLength(1);
    expect(doc.materials[0]!.doubleSided ?? false).toBe(false);
    const source = JSON.parse(readFileSync(join('art/voxels', `${name}.json`), 'utf8')) as { size: number[]; parts: Record<string, number[]> };
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const node of doc.nodes) {
      if (node.mesh === undefined) continue;
      expect(node.extras!.ao_samples).toBe(ART.BAKE_SAMPLES);
      expect(node.extras!.ao_min).toBeGreaterThanOrEqual(0);
      expect(node.extras!.ao_max).toBeLessThanOrEqual(1);
      for (const primitive of doc.meshes[node.mesh]!.primitives) {
        const position = doc.accessors[primitive.attributes.POSITION!]!;
        expect(primitive.attributes.NORMAL).toBeDefined();
        expect(primitive.attributes.COLOR_0).toBeDefined();
        expect(primitive.attributes.TEXCOORD_0).toBeUndefined();
        expect(doc.accessors[primitive.attributes.COLOR_0!]!.count).toBe(position.count);
        for (let axis = 0; axis < 3; axis++) {
          const offset = node.translation?.[axis] ?? 0;
          lo[axis] = Math.min(lo[axis]!, position.min![axis]! + offset);
          hi[axis] = Math.max(hi[axis]!, position.max![axis]! + offset);
        }
      }
    }
    expect(lo[1]).toBeCloseTo(0, 5);
    for (let axis = 0; axis < 3; axis++) expect(hi[axis]! - lo[axis]!).toBeLessThanOrEqual(source.size[axis]! / VIEW.VOXELS_PER_TILE + 0.00001);
    for (const part of Object.keys(source.parts)) expect(doc.nodes.some(node => node.extras?.part === part)).toBe(true);
    expect(statSync(join('art', `${name}.blend`)).size).toBeGreaterThan(0);
    const png = readFileSync(join('art/previews', `${name}.png`));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png[25]).toBe(6); // RGBA, including transparent background.
    expect(png.readUInt32BE(16)).toBe(name === 'logo' ? ART.LOGO_PREVIEW_WIDTH : ART.PREVIEW_SIZE);
  });
});
