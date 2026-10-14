import { readFileSync } from 'node:fs';
import { Box3, InstancedMesh, Matrix4, MeshLambertMaterial, MeshStandardMaterial, PointLight } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { Arena } from '../../client/src/game/arena';
import { STREET } from '../../shared/config';

async function fixture(): Promise<Arena> {
  const data = readFileSync('client/public/models/arena.glb');
  const asset = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  return new Arena(asset.scene, new MeshStandardMaterial({ vertexColors: true }), new MeshLambertMaterial({ vertexColors: true }));
}
describe('arena roadside', () => {
  it('meets final bleacher clearance, nearby structure height and tower spacing limits', async () => {
    const arena = await fixture(), matrix = new Matrix4();
    const towers: number[] = []; let nearestStand = Infinity, nearHeight = 0;
    for (const mesh of arena.root.children) {
      if (!(mesh instanceof InstancedMesh) || ['arena_foam', 'arena_tuft', 'arena_flower', 'arena_spectator', 'arena_scarf'].includes(mesh.name)) continue;
      mesh.geometry.computeBoundingBox();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const bounds = new Box3().copy(mesh.geometry.boundingBox!).applyMatrix4(matrix);
        const gap = bounds.max.x < -0.5 ? -0.5 - bounds.max.x : bounds.min.x - 8.5;
        if (mesh.name.includes('bleacher')) nearestStand = Math.min(nearestStand, gap);
        if (gap < STREET.MIN_BLEACHER_GAP) nearHeight = Math.max(nearHeight, bounds.max.y);
        if (mesh.name === 'arena_spotlight') towers.push(matrix.elements[14]!);
      }
    }
    expect(nearestStand).toBeGreaterThanOrEqual(STREET.MIN_BLEACHER_GAP);
    expect(nearestStand).toBeCloseTo(2.15, 5);
    expect(nearHeight).toBeLessThanOrEqual(STREET.NEAR_DECOR_MAX_HEIGHT);
    expect(nearHeight).toBeCloseTo(11 / 12, 5);
    towers.sort((a, b) => a - b);
    for (let i = 1; i < towers.length; i++) expect(towers[i]! - towers[i - 1]!).toBeGreaterThanOrEqual(STREET.SPOT_MIN_ROWS);
    expect(towers).toEqual([10, 26]); // Home's top rows are behind the selection stage, at negative Z.
  });
  it('keeps every instance of the event furniture outside playable columns', async () => {
    const arena = await fixture(), matrix = new Matrix4();
    for (const mesh of arena.root.children) {
      if (!(mesh instanceof InstancedMesh) || ['arena_foam', 'arena_tuft', 'arena_flower'].includes(mesh.name)) continue;
      mesh.geometry.computeBoundingBox();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const bounds = new Box3().copy(mesh.geometry.boundingBox!).applyMatrix4(matrix);
        expect(bounds.max.x < -0.5 || bounds.min.x > 8.5, `${mesh.name} ${i}`).toBe(true);
      }
    }
  });
  it('cheers with shared uniforms without changing spectator instance buffers', async () => {
    const arena = await fixture();
    const crowd = arena.root.getObjectByName('arena_spectator') as InstancedMesh;
    const initial = crowd.instanceMatrix.array.slice(); const version = crowd.instanceMatrix.version;
    arena.update(5); arena.cheerKO(); arena.update(5.1); expect(arena.cheering).toBe(true);
    arena.update(5 + STREET.CHEER_SECONDS + 0.01); expect(arena.cheering).toBe(false);
    arena.cheerKO(); arena.setReduced(true); arena.update(7); expect(arena.cheering).toBe(false);
    expect(crowd.instanceMatrix.version).toBe(version); expect(crowd.instanceMatrix.array).toEqual(initial);
  });
  it('switches authored biome variants and limits nighttime point lights to High', async () => {
    const arena = await fixture();
    arena.setBiome('autumn'); expect(arena.root.getObjectByName('arena_hay')!.visible).toBe(true);
    arena.setBiome('snow'); expect(arena.root.getObjectByName('arena_snow_bleacher')!.visible).toBe(true);
    expect(arena.root.getObjectByName('arena_scarf')!.visible).toBe(true);
    expect(arena.root.getObjectByName('arena_hay')!.visible).toBe(false);
    arena.setBiome('nightCity'); expect(arena.root.getObjectByName('arena_neon_sign')!.visible).toBe(true);
    const lights = arena.root.children.filter(obj => obj instanceof PointLight);
    expect(lights.every(light => light.visible)).toBe(true);
    arena.applyTier('medium'); expect(lights.every(light => !light.visible)).toBe(true);
  });
});
