import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART, VIEW } from '../../shared/config';

interface Gltf {
  asset: { version: string; generator: string };
  images?: unknown[]; textures?: unknown[]; extensionsUsed?: string[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
  accessors: { count: number; min?: number[]; max?: number[]; bufferView: number; byteOffset?: number; componentType: number }[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number }[] }[];
  nodes: { name: string; mesh?: number; translation?: number[]; children?: number[]; extras?: { part: string; ao_samples: number; ao_min: number; ao_max: number; surface_mesher: string } }[];
  materials: { doubleSided?: boolean }[];
}
const modelDir = join(process.cwd(), 'client/public/models');
const models = existsSync(modelDir) ? readdirSync(modelDir).filter(file => file.endsWith('.glb') && !['logo.glb', 'home_controls.glb'].includes(file)) : [];

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
    const source = JSON.parse(readFileSync(join('art/voxels', `${name}.json`), 'utf8')) as { size: number[]; parts: Record<string, number[]>; voxels: number[][] };
    const binaryStart = 20 + bytes.readUInt32LE(12) + 8;
    const component = (accessorId: number, index: number, axis = 0, vector = false) => {
      const accessor = doc.accessors[accessorId]!;
      const view = doc.bufferViews[accessor.bufferView]!;
      const size = accessor.componentType === 5123 ? 2 : 4;
      const offset = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
        + index * (view.byteStride ?? size * (vector ? 3 : 1)) + axis * size;
      return accessor.componentType === 5126 ? bytes.readFloatLE(offset)
        : size === 2 ? bytes.readUInt16LE(offset) : bytes.readUInt32LE(offset);
    };
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const worldOffset = (nodeIndex: number, axis: number): number => {
      const parent = doc.nodes.findIndex(node => node.children?.includes(nodeIndex));
      return (doc.nodes[nodeIndex]!.translation?.[axis] ?? 0) + (parent < 0 ? 0 : worldOffset(parent, axis));
    };
    for (const node of doc.nodes) {
      if (node.mesh === undefined) continue;
      expect(node.extras!.surface_mesher).toBe('closed-part-greedy-v1');
      expect(node.extras!.ao_samples).toBe(ART.BAKE_SAMPLES);
      expect(node.extras!.ao_min).toBeGreaterThanOrEqual(0);
      expect(node.extras!.ao_max).toBeLessThanOrEqual(1);
      let volume6 = 0;
      for (const primitive of doc.meshes[node.mesh]!.primitives) {
        const position = doc.accessors[primitive.attributes.POSITION!]!;
        expect(primitive.attributes.NORMAL).toBeDefined();
        expect(primitive.attributes.COLOR_0).toBeDefined();
        expect(primitive.attributes.TEXCOORD_0).toBeUndefined();
        expect(doc.accessors[primitive.attributes.COLOR_0!]!.count).toBe(position.count);
        for (let i = 0; i < doc.accessors[primitive.indices]!.count; i += 3) {
          const points = [0, 1, 2].map(corner => {
            const index = component(primitive.indices, i + corner);
            return [0, 1, 2].map(axis => component(primitive.attributes.POSITION!, index, axis, true));
          });
          const [a, b, c] = points as [number[], number[], number[]];
          volume6 += a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!)
            + a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!)
            + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!);
        }
        for (let axis = 0; axis < 3; axis++) {
          expect(position.max![axis]! - position.min![axis]!).toBeGreaterThan(0);
          const offset = worldOffset(doc.nodes.indexOf(node), axis);
          lo[axis] = Math.min(lo[axis]!, position.min![axis]! + offset);
          hi[axis] = Math.max(hi[axis]!, position.max![axis]! + offset);
        }
      }
      const voxelCount = source.parts[node.extras!.part]?.length
        ?? source.voxels.length - Object.values(source.parts).reduce((sum, indices) => sum + indices.length, 0);
      expect(volume6 / 6).toBeCloseTo(voxelCount / VIEW.VOXELS_PER_TILE ** 3, 5);
    }
    expect(lo[1]).toBeCloseTo(0, 5);
    for (let axis = 0; axis < 3; axis++) expect(hi[axis]! - lo[axis]!).toBeLessThanOrEqual(source.size[axis]! / VIEW.VOXELS_PER_TILE + 0.00001);
    for (const part of Object.keys(source.parts)) expect(doc.nodes.some(node => node.extras?.part === part)).toBe(true);
    expect(statSync(join('art', `${name}.blend`)).size).toBeGreaterThan(0);
    const png = readFileSync(join('art/previews', `${name}.png`));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png[25]).toBe(6); // RGBA, including transparent background.
    expect(png.readUInt32BE(16)).toBe(ART.PREVIEW_SIZE);
  });
  it.each([
    ['chicken', 9], ['penguin', 9], ['frog', 6], ['fox', 6], ['pig', 7], ['cat', 6],
  ] as const)('%s uses two single-voxel eyes one voxel below the face top', (name, faceTop) => {
    const source = JSON.parse(readFileSync(join('art/voxels', `${name}.json`), 'utf8')) as { voxels: number[][]; parts: { eyes: number[] } };
    expect(source.parts.eyes).toHaveLength(2);
    for (const index of source.parts.eyes) expect(source.voxels[index]![1]).toBe(faceTop - 1);
  });
});
