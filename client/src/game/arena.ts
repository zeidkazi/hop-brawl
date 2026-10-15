import { Color, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, PointLight, Sphere, Vector3 } from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, CONFIG, HOME, STREET } from '../../../shared/config';
import { mulberry32 } from '../../../shared/rng';
import { Outlines } from './outlines';
import type { Tier } from './quality';
import type { Biome } from '../../../shared/types';
import type { Row } from '../../../shared/types';
import { grassSceneryAllowed } from '../../../shared/scenery';
import { Box3, Matrix4 } from 'three';

export type ArenaBiome = Biome;
/** Static instance buffers + shared GPU crowd clock, no spectator update objects. */
export class Arena {
  readonly root = new Group();
  readonly foam: InstancedMesh;
  private readonly batches = new Map<string, InstancedMesh>();
  readonly outlines = new Outlines();
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
  private readonly originals = new Map<InstancedMesh, Float32Array>();
  private readonly placement = new Matrix4();
  private readonly footprint = new Box3();
  private readonly soundPoints = Array.from({ length: STREET.ARENA_ROWS.length * 2 }, () => ({ x: 0, z: 0, count: 0 }));

  constructor(assets: Group, private readonly standard: MeshStandardMaterial, private readonly lambert: MeshLambertMaterial) {
    const batch = (name: string, count: number): InstancedMesh => {
      const pieces = assets.children.filter((obj): obj is Mesh => obj instanceof Mesh && obj.userData.arena_kind === name).map(obj => {
        const geometry = obj.geometry.clone();
        if (name === 'spectator' || name === 'scarf') {
          const color = geometry.getAttribute('color'), count = color.count;
          const arms = new Float32Array(count), shirts = new Float32Array(count);
          arms.fill(obj.userData.part === 'arm_left' ? -1 : obj.userData.part === 'arm_right' ? 1 : 0);
          for (let i = 0; i < count; i++) shirts[i] = Math.abs(color.getX(i) - color.getY(i)) < 0.01 && Math.abs(color.getX(i) - color.getZ(i)) < 0.01 && color.getX(i) > 0.2 ? 1 : 0;
          geometry.setAttribute('armSide', new Float32BufferAttribute(arms, 1)); geometry.setAttribute('shirt', new Float32BufferAttribute(shirts, 1));
        }
        return geometry;
      });
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
      const rotation = side ? Math.PI / 2 : -Math.PI / 2;
      for (const name of ['bleacher', 'snow_bleacher']) this.place(this.batches.get(name)!, i, x, 0, z, rotation);
      this.place(this.batches.get('bunting')!, i, x + (side ? 1.6 : -1.6), 0, z, rotation);
      this.place(this.batches.get('barrier')!, i, x + (side ? -1.3 : 1.3), 0, z, rotation);
      this.place(this.batches.get('hay')!, i, x, 0, z + 2.8);
      this.place(this.batches.get('pumpkin')!, i, x + (side ? 0.7 : -0.7), 0, z + 2.8);
      this.place(this.batches.get('neon_sign')!, i, x, 1.1, z - 1.4, rotation);
      for (let j = 0; j < 2; j++) this.place(this.batches.get('cone')!, i * 2 + j, x + (side ? -1.3 : 1.3), 0, z + (j ? 1.3 : -1.3));
      for (let j = 0; j < 6; j++) {
        const tier = Math.floor(j / 2), localX = (j % 2 ? 0.65 : -0.65), localZ = 0.5 - tier * 0.5;
        const px = x + Math.cos(rotation) * localX + Math.sin(rotation) * localZ;
        const pz = z - Math.sin(rotation) * localX + Math.cos(rotation) * localZ;
        const y = (2 - tier) / 3 + 0.25;
        this.place(spectators, i * 6 + j, px, y, pz, rotation, STREET.CROWD_SCALE);
        spectators.setColorAt(i * 6 + j, this.color.set(COLORS.players[(i + j) % 4]!));
        this.place(this.batches.get('scarf')!, i * 6 + j, px, y + 0.5, pz, rotation, STREET.CROWD_SCALE);
      }
    }
    for (let i = 0; i < 2; i++) {
      const x = STREET.SPOT_SIDE_X[i]!, z = STREET.SPOT_ROWS[i]!;
      this.place(this.batches.get('spotlight')!, i, x, 0, z, i ? Math.PI / 2 : -Math.PI / 2);
      const light = new PointLight(STREET.RIM_COLOR, STREET.SPOT_INTENSITY, STREET.SPOT_DISTANCE);
      light.position.set(x, 3, z); this.lamps.push(light); this.root.add(light);
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
    for (const mesh of this.batches.values()) {
      mesh.geometry.computeBoundingBox();
      this.originals.set(mesh, new Float32Array(mesh.instanceMatrix.array));
    }
    this.applyTier('high');
  }
  fitGameplay(rowAt: (z: number) => Row | undefined): void {
    this.root.updateMatrixWorld(true);
    for (const [name, mesh] of this.batches) {
      const original = this.originals.get(mesh)!;
      for (let i = 0; i < mesh.count; i++) {
        this.placement.fromArray(original, i * 16).premultiply(this.root.matrixWorld);
        this.footprint.copy(mesh.geometry.boundingBox!).applyMatrix4(this.placement);
        const b = this.footprint;
        if (name !== 'foam' && grassSceneryAllowed(rowAt, b.min.x, b.max.x, -b.max.z, -b.min.z, STREET.MIN_BLEACHER_GAP)) this.placement.fromArray(original, i * 16);
        else this.placement.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, this.placement);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  /** Audio follows the surviving crowd instances after terrain filtering, not invisible stands. */
  soundSources(): readonly { x: number; z: number; count: number }[] {
    this.root.updateWorldMatrix(true, false);
    for (const point of this.soundPoints) { point.x = point.z = point.count = 0; }
    const mesh = this.batches.get('spectator')!;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, this.placement); const e = this.placement.elements;
      if (Math.hypot(e[0]!, e[1]!, e[2]!) === 0) continue;
      this.placement.premultiply(this.root.matrixWorld); const point = this.soundPoints[Math.floor(i / 6)]!;
      point.x += this.placement.elements[12]!; point.z -= this.placement.elements[14]!; point.count++;
    }
    for (const point of this.soundPoints) if (point.count) { point.x /= point.count; point.z /= point.count; }
    return this.soundPoints;
  }
  restoreHome(): void {
    for (const [mesh, original] of this.originals) { mesh.instanceMatrix.array.set(original); mesh.instanceMatrix.needsUpdate = true; }
  }
  private place(mesh: InstancedMesh, index: number, x: number, y: number, z: number, angle = 0, scale = 1): void {
    this.transform.position.set(x, y, z); this.transform.rotation.set(0, angle, 0); this.transform.scale.setScalar(scale);
    this.transform.updateMatrix(); mesh.setMatrixAt(index, this.transform.matrix);
  }
  private animateMaterial(material: Material): void {
    material.onBeforeCompile = shader => {
      shader.uniforms.uCrowdTime = this.clock; shader.uniforms.uCheer = this.cheer;
      shader.vertexShader = 'attribute float armSide; attribute float shirt; uniform float uCrowdTime; uniform float uCheer;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\nvColor.xyz /= max(instanceColor, vec3(0.001)); vColor.xyz *= mix(vec3(1.0), instanceColor, shirt);\n#endif');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nfloat phase = uCrowdTime * ${STREET.CROWD_SPEED.toFixed(1)} + instanceMatrix[3].x * 2.0 + instanceMatrix[3].z;
        float angle = armSide * 3.14159265 * min(1.0, uCheer / ${STREET.CHEER_HEIGHT});
        vec2 pivot = vec2(armSide * ${STREET.CROWD_ARM_X}, ${STREET.CROWD_ARM_Y});
        vec2 arm = transformed.xy - pivot;
        if (armSide != 0.0) {
          transformed.xy = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * arm + pivot;
          transformed.xy += vec2(armSide * ${STREET.CROWD_ARM_SPREAD}, ${STREET.CROWD_ARM_LIFT}) * min(1.0, uCheer / ${STREET.CHEER_HEIGHT});
        }
        transformed.y += sin(phase) * ${STREET.CROWD_BOB} + abs(sin(phase * 2.0)) * uCheer;`);
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
            : name === 'neon_sign' ? this.biome === 'nightCity' : true;
    }
    this.batches.get('spectator')!.material = this.crowdMaterials[tier === 'high' ? 0 : 1]!;
    this.batches.get('scarf')!.material = this.crowdMaterials[tier === 'high' ? 0 : 1]!;
    if (this.biome === 'nightCity') { this.batches.get('neon_sign')!.material = this.night; this.batches.get('spotlight')!.material = this.night; }
    for (const light of this.lamps) light.visible = this.biome === 'nightCity' && tier === 'high';
  }
  warmAll(): void { for (const mesh of this.batches.values()) mesh.visible = true; }
  setReduced(value: boolean): void { this.reduced = value; }
  cheerKO(time = this.clock.value): void { this.cheerEnd = time + STREET.CHEER_SECONDS; }
  get cheering(): boolean { return this.cheer.value > 0; }
  update(time: number): void {
    this.clock.value = this.reduced ? 0 : time;
    this.cheer.value = this.reduced || time >= this.cheerEnd ? 0 : STREET.CHEER_HEIGHT;
  }
  moveFoam(index: number, x: number, z: number): void {
    this.place(this.foam, index, x, 0.01, z); this.foam.instanceMatrix.needsUpdate = true;
  }
}
