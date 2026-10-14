import { Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, PointLight, Sphere, Vector3 } from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, CONFIG, HOME, STREET } from '../../../shared/config';
import { mulberry32 } from '../../../shared/rng';
import { Outlines } from './outlines';
import type { Tier } from './quality';

export type ArenaBiome = 'meadow' | 'autumn' | 'snow' | 'city';
/** Static instance buffers + shared GPU crowd clock, no spectator update objects. */
export class Arena {
  readonly root = new Group();
  readonly foam: InstancedMesh;
  private readonly batches = new Map<string, InstancedMesh>();
  private readonly outlines = new Outlines();
  private readonly clock = { value: 0 };
  private readonly cheer = { value: 0 };
  private readonly transform = new Object3D();
  private readonly color = new Color();
  private readonly crowdMaterials: Material[];
  private readonly night = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  private readonly lamps: PointLight[] = [];
  private biome: ArenaBiome = 'meadow';
  private tier: Tier = 'high';
  private cheerEnd = -1;
  private reduced = false;

  constructor(assets: Group, private readonly standard: MeshStandardMaterial, private readonly lambert: MeshLambertMaterial) {
    const batch = (name: string, count: number): InstancedMesh => {
      const pieces = assets.children.filter((obj): obj is Mesh => obj instanceof Mesh && obj.userData.arena_kind === name).map(obj => obj.geometry.clone());
      const geometry = mergeGeometries(pieces)!; for (const piece of pieces) piece.dispose();
      const mesh = new InstancedMesh(geometry, standard, count);
      mesh.name = `arena_${name}`; mesh.userData.arena = true;
      mesh.boundingSphere = new Sphere(new Vector3(4, 0, 0), HOME.GROUND_WIDTH);
      mesh.receiveShadow = true; this.root.add(mesh); this.batches.set(name, mesh); return mesh;
    };
    const stands = STREET.ARENA_ROWS.length * 2;
    for (const name of ['bleacher', 'snow_bleacher', 'bunting', 'barrier', 'hay', 'pumpkin', 'neon_sign']) batch(name, stands);
    batch('cone', stands * 2); batch('spotlight', 2);
    const spectators = batch('spectator', stands * 6); batch('scarf', spectators.count);
    this.crowdMaterials = [standard.clone(), lambert.clone()];
    for (const mat of this.crowdMaterials) this.animateMaterial(mat);
    this.outlines.add(spectators, 'animal'); this.animateMaterial(this.outlines.material);
    for (let i = 0; i < stands; i++) {
      const side = i % 2, x = STREET.ARENA_SIDE_X[side]!, z = STREET.ARENA_ROWS[Math.floor(i / 2)]!;
      const rotation = side ? -Math.PI / 2 : Math.PI / 2;
      for (const name of ['bleacher', 'snow_bleacher']) this.place(this.batches.get(name)!, i, x, 0, z, rotation);
      this.place(this.batches.get('bunting')!, i, x, 0, z - 2, rotation);
      this.place(this.batches.get('barrier')!, i, x, 0, z + 2, rotation);
      this.place(this.batches.get('hay')!, i, x, 0, z + 2.8);
      this.place(this.batches.get('pumpkin')!, i, x + (side ? 0.7 : -0.7), 0, z + 2.8);
      this.place(this.batches.get('neon_sign')!, i, x, 1.1, z - 1.4, rotation);
      for (let j = 0; j < 2; j++) this.place(this.batches.get('cone')!, i * 2 + j, x, 0, z + 1.3 + j * 1.5);
      for (let j = 0; j < 6; j++) {
        const tier = Math.floor(j / 2), localX = (j % 2 ? 0.65 : -0.65), localZ = tier * 0.5 - 0.5;
        const px = x + Math.cos(rotation) * localX + Math.sin(rotation) * localZ;
        const pz = z - Math.sin(rotation) * localX + Math.cos(rotation) * localZ;
        const y = (2 - tier) / 3 + 0.18;
        this.place(spectators, i * 6 + j, px, y, pz, rotation, 0.68);
        spectators.setColorAt(i * 6 + j, this.color.set(COLORS.players[(i + j) % 4]!));
        this.place(this.batches.get('scarf')!, i * 6 + j, px, y + 0.32, pz, rotation, 0.68);
      }
    }
    for (let i = 0; i < 2; i++) {
      const x = STREET.ARENA_SIDE_X[i]!;
      this.place(this.batches.get('spotlight')!, i, x, 0, -5, i ? -Math.PI / 2 : Math.PI / 2);
      const light = new PointLight(STREET.RIM_COLOR, STREET.SPOT_INTENSITY, STREET.SPOT_DISTANCE);
      light.position.set(x, 3, -5); this.lamps.push(light); this.root.add(light);
    }
    const random = mulberry32(CONFIG.HOME_DIORAMA_SEED + 1);
    for (const [name, count] of [['tuft', STREET.TUFT_COUNT], ['flower', STREET.FLOWER_COUNT]] as const) {
      const mesh = batch(name, count);
      for (let i = 0; i < count; i++) {
        const x = random() * 24 - 8; let row = Math.floor(random() * 32 - 16);
        while (HOME.ROAD_ROWS.includes(row as never) || HOME.RIVER_ROWS.includes(row as never) || (x > 2 && x < 6 && Math.abs(row) < 3)) row++;
        this.place(mesh, i, x, 0, -row);
      }
    }
    this.foam = batch('foam', HOME.LOG_COUNT * 2);
    this.applyTier('high');
  }
  private place(mesh: InstancedMesh, index: number, x: number, y: number, z: number, angle = 0, scale = 1): void {
    this.transform.position.set(x, y, z); this.transform.rotation.set(0, angle, 0); this.transform.scale.setScalar(scale);
    this.transform.updateMatrix(); mesh.setMatrixAt(index, this.transform.matrix);
  }
  private animateMaterial(material: Material): void {
    material.onBeforeCompile = shader => {
      shader.uniforms.uCrowdTime = this.clock; shader.uniforms.uCheer = this.cheer;
      shader.vertexShader = 'uniform float uCrowdTime; uniform float uCheer;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nfloat phase = uCrowdTime * ${STREET.CROWD_SPEED.toFixed(1)} + instanceMatrix[3].x * 2.0 + instanceMatrix[3].z; transformed.y += sin(phase) * ${STREET.CROWD_BOB} + abs(sin(phase * 2.0)) * uCheer;`);
    };
    material.customProgramCacheKey = () => 'street-crowd';
  }
  setBiome(value: ArenaBiome): void { this.biome = value; this.applyTier(this.tier); }
  applyTier(tier: Tier): void {
    this.tier = tier; this.outlines.applyTier(tier);
    for (const [name, mesh] of this.batches) {
      mesh.material = tier === 'high' ? this.standard : this.lambert;
      mesh.castShadow = tier === 'high' && ['bleacher', 'snow_bleacher', 'spotlight', 'barrier'].includes(name);
      mesh.visible = name === 'snow_bleacher' || name === 'scarf' ? this.biome === 'snow'
        : name === 'bleacher' ? this.biome !== 'snow'
          : name === 'hay' || name === 'pumpkin' ? this.biome === 'autumn'
            : name === 'neon_sign' ? this.biome === 'city' : true;
    }
    this.batches.get('spectator')!.material = this.crowdMaterials[tier === 'high' ? 0 : 1]!;
    if (this.biome === 'city') { this.batches.get('neon_sign')!.material = this.night; this.batches.get('spotlight')!.material = this.night; }
    for (const light of this.lamps) light.visible = this.biome === 'city' && tier === 'high';
  }
  warmAll(): void { for (const mesh of this.batches.values()) mesh.visible = true; }
  setReduced(value: boolean): void { this.reduced = value; }
  cheerKO(time: number): void { this.cheerEnd = time + STREET.CHEER_SECONDS; }
  update(time: number): void {
    this.clock.value = this.reduced ? 0 : time;
    this.cheer.value = this.reduced || time >= this.cheerEnd ? 0 : STREET.CHEER_HEIGHT;
  }
  moveFoam(index: number, x: number, z: number): void {
    this.place(this.foam, index, x, 0.01, z); this.foam.instanceMatrix.needsUpdate = true;
  }
}
