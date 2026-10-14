import {
  BoxGeometry, CircleGeometry, Color, DynamicDrawUsage, Float32BufferAttribute,
  Group, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial,
  Object3D, Sphere, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANIMAL_SIZES, COLORS, CONFIG, VIEW, WORLD } from '../../../shared/config';
import { laneItemX, trainX } from '../../../shared/hazards';
import { hash32, mulberry32 } from '../../../shared/rng';
import type { Row, RowKind } from '../../../shared/types';
import { generateRow } from '../../../shared/worldgen';
import type { Tier } from './quality';

const KINDS: readonly RowKind[] = ['grass', 'road', 'river', 'rail'];
const ROW_COLORS = [COLORS.grass, COLORS.road, COLORS.water, COLORS.rail];
const capacity = VIEW.POOL_ROWS * VIEW.PROPS_PER_ROW;

function whiteVertices(geometry: BoxGeometry | CircleGeometry): void {
  const data = new Float32Array(geometry.getAttribute('position').count * 3);
  data.fill(1);
  geometry.setAttribute('color', new Float32BufferAttribute(data, 3));
}

function groundGeometry(): ReturnType<typeof mergeGeometries> {
  const tiles: BoxGeometry[] = [];
  const random = mulberry32(CONFIG.HOME_DIORAMA_SEED);
  for (let x = VIEW.DECOR_MIN_X; x <= VIEW.DECOR_MAX_X; x++) {
    const tile = new BoxGeometry(1, VIEW.GROUND_DEPTH, 1);
    tile.translate(x, -VIEW.GROUND_DEPTH / 2, 0);
    const data = new Float32Array(tile.getAttribute('position').count * 3);
    data.fill(1 - VIEW.TILE_NOISE + random() * VIEW.TILE_NOISE * 2);
    tile.setAttribute('color', new Float32BufferAttribute(data, 3));
    tiles.push(tile);
  }
  const merged = mergeGeometries(tiles);
  for (const tile of tiles) tile.dispose();
  return merged;
}

/** All meshes, matrices and row slots exist before Loading ends. */
export class WorldView {
  readonly root = new Group();
  readonly standard = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  readonly lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  readonly grounds: InstancedMesh[] = [];
  readonly obstacles: InstancedMesh;
  readonly vehicles: InstancedMesh;
  readonly logs: InstancedMesh;
  readonly crates: InstancedMesh;
  readonly animals: InstancedMesh;
  readonly blobs: InstancedMesh;
  readonly podium: InstancedMesh;
  readonly rows = Array.from({ length: VIEW.POOL_ROWS }, () => ({ z: NaN, row: null as Row | null }));
  readonly waterUniform = { value: 0 };
  private readonly cube = new BoxGeometry(1, 1, 1);
  private readonly transform = new Object3D();
  private readonly color = new Color();
  private readonly matrix = new Matrix4();
  private seed: number = CONFIG.HOME_DIORAMA_SEED;
  private preparedBottom = NaN;
  private requestedBottom = 0;
  private pending = false;
  private tier: Tier = 'high';
  private readonly groundCounts = new Int32Array(KINDS.length);
  private readonly waterMaterials: (MeshStandardMaterial | MeshLambertMaterial)[] = [];
  animal = 0;
  animalX = 4;
  animalZ = 1;
  animalSwap = 0;
  station = 'home';
  generatedRows = 0;

  constructor() {
    whiteVertices(this.cube);
    const geometry = groundGeometry()!;
    for (let i = 0; i < KINDS.length; i++) {
      const ground = new InstancedMesh(geometry, this.standard, VIEW.POOL_ROWS);
      ground.instanceMatrix.setUsage(DynamicDrawUsage);
      ground.receiveShadow = true;
      ground.boundingSphere = new Sphere(new Vector3(4, 0, -8), VIEW.FAR);
      ground.count = 0;
      this.root.add(ground);
      this.grounds.push(ground);
    }
    this.obstacles = this.batch(capacity);
    this.vehicles = this.batch(capacity);
    this.logs = this.batch(capacity);
    this.crates = this.batch(VIEW.POOL_ROWS);
    this.animals = this.batch(CONFIG.MAX_PLAYERS_PRIVATE);
    this.podium = this.batch(CONFIG.MAX_PLAYERS_PRIVATE);
    const circle = new CircleGeometry(1, VIEW.BLOB_SEGMENTS);
    circle.rotateX(-Math.PI / 2);
    this.blobs = new InstancedMesh(circle, new MeshBasicMaterial({ color: 0, transparent: true, opacity: VIEW.BLOB_OPACITY, depthWrite: false }), capacity);
    this.blobs.instanceMatrix.setUsage(DynamicDrawUsage);
    this.blobs.boundingSphere = new Sphere(new Vector3(4, 0, -8), VIEW.FAR);
    this.root.add(this.blobs);
    // Precompile both wave and flat materials; Low swaps without shader creation.
    for (const base of [this.standard, this.lambert]) {
      const material = base.clone();
      material.onBeforeCompile = shader => {
        shader.uniforms.uTime = this.waterUniform;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>\ntransformed.y += sin(position.x * ${VIEW.WATER_FREQUENCY.toFixed(1)} + uTime * ${VIEW.WATER_SPEED.toFixed(1)}) * ${VIEW.WATER_AMPLITUDE};`);
      };
      material.customProgramCacheKey = () => 'hop-brawl-water';
      this.waterMaterials.push(material);
    }
    this.prepareWindow(0);
    this.update(0);
  }

  private batch(size: number): InstancedMesh {
    const mesh = new InstancedMesh(this.cube, this.standard, size);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.boundingSphere = new Sphere(new Vector3(4, 0, -8), VIEW.FAR);
    // Allocate instance colours now, even when the first world has no such object.
    for (let i = 0; i < size; i++) mesh.setColorAt(i, this.color.set('#FFFFFF'));
    mesh.count = 0;
    this.root.add(mesh);
    return mesh;
  }

  /** Called outside rendering, or scheduled by requestWindow's stable callback. */
  prepareWindow(camZ: number): void {
    const bottom = Math.floor(camZ) - WORLD.STREAM_BEHIND_ROWS;
    if (bottom === this.preparedBottom) return;
    this.preparedBottom = bottom;
    this.groundCounts.fill(0);
    for (let i = 0; i < this.rows.length; i++) {
      const z = bottom + i;
      const slot = this.rows[((z % VIEW.POOL_ROWS) + VIEW.POOL_ROWS) % VIEW.POOL_ROWS]!;
      if (slot.z !== z) {
        slot.z = z;
        slot.row = generateRow(this.seed, z);
        this.generatedRows++;
      }
      const row = slot.row!;
      const kind = KINDS.indexOf(row.kind);
      const index = this.groundCounts[kind]!;
      this.groundCounts[kind] = index + 1;
      const mesh = this.grounds[kind]!;
      this.matrix.makeTranslation(0, 0, -z);
      mesh.setMatrixAt(index, this.matrix);
      this.color.set(row.kind === 'grass' && z % 2 ? COLORS.grassAlt : ROW_COLORS[kind]!);
      mesh.setColorAt(index, this.color);
    }
    for (let i = 0; i < this.grounds.length; i++) {
      const mesh = this.grounds[i]!;
      mesh.count = this.groundCounts[i]!;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  private readonly flushWindow = (): void => { this.pending = false; this.prepareWindow(this.requestedBottom); };
  requestWindow(camZ: number): void {
    this.requestedBottom = camZ;
    if (!this.pending && Math.floor(camZ) - WORLD.STREAM_BEHIND_ROWS !== this.preparedBottom) {
      this.pending = true;
      queueMicrotask(this.flushWindow);
    }
  }

  reset(seed: number): void {
    this.seed = seed;
    this.preparedBottom = NaN;
    for (const slot of this.rows) slot.z = NaN;
    this.prepareWindow(0);
  }

  applyTier(tier: Tier): void {
    this.tier = tier;
    const material = tier === 'high' ? this.standard : this.lambert;
    for (const mesh of this.grounds) mesh.material = material;
    for (const mesh of [this.obstacles, this.vehicles, this.logs, this.crates, this.animals, this.podium]) mesh.material = material;
    this.grounds[2]!.material = tier === 'low' ? this.lambert : this.waterMaterials[tier === 'high' ? 0 : 1]!;
    this.obstacles.castShadow = this.logs.castShadow = this.crates.castShadow = tier === 'high';
    this.vehicles.castShadow = this.animals.castShadow = tier !== 'low';
    this.blobs.visible = tier === 'low';
  }

  private put(mesh: InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string): void {
    const index = mesh.count++;
    this.transform.position.set(x, y + sy / 2, -z);
    this.transform.scale.set(sx, sy, sz);
    this.transform.updateMatrix();
    mesh.setMatrixAt(index, this.transform.matrix);
    mesh.setColorAt(index, this.color.set(color));
  }

  private blob(x: number, z: number, sx: number, sz: number): void {
    if (this.tier !== 'low') return;
    this.transform.position.set(x, VIEW.BLOB_Y, -z);
    this.transform.scale.set(sx, 1, sz);
    this.transform.updateMatrix();
    this.blobs.setMatrixAt(this.blobs.count++, this.transform.matrix);
  }

  update(time: number): void {
    this.waterUniform.value = time;
    this.obstacles.count = this.vehicles.count = this.logs.count = this.crates.count = this.animals.count = this.blobs.count = this.podium.count = 0;
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!.row!;
      if (row.kind === 'grass') {
        for (let j = 0; j < row.obstacles.length; j++) {
          const obstacle = row.obstacles[j]!;
          const tree = obstacle.kind === 'tree';
          this.put(this.obstacles, obstacle.column, 0, row.z, (tree ? 10 : 8) / 12, (tree ? 20 : 6) / 12, (tree ? 10 : 8) / 12, tree ? COLORS.tree : COLORS.rock);
        }
        if (row.crate) this.put(this.crates, row.crate.column, 0, row.z, 10 / 12, 10 / 12, 10 / 12, COLORS.crate);
      } else if (row.kind === 'road') {
        for (let j = 0; j < row.vehicles.length; j++) {
          const car = row.vehicles[j]!;
          const x = laneItemX(row, car, time);
          this.put(this.vehicles, x, 0, row.z, car.length, (car.kind === 'car' ? 9 : 13) / 12, 10 / 12, COLORS.players[j % COLORS.players.length]!);
          this.blob(x, row.z, car.length / 2, 0.45);
        }
      } else if (row.kind === 'river') {
        for (let j = 0; j < row.logs.length; j++) {
          const log = row.logs[j]!;
          this.put(this.logs, laneItemX(row, log, time), -0.1, row.z, log.length, 5 / 12, 10 / 12, COLORS.log);
        }
      } else {
        const x = trainX(row, time);
        if (x !== null) this.put(this.vehicles, x, 0, row.z, WORLD.TRAIN_LENGTH, 16 / 12, 11 / 12, COLORS.red);
      }
      // Decorative scenery uses stable row hashes and cannot be stood on.
      this.put(this.obstacles, (hash32(this.seed, row.z) & 1) ? -3 : 11, 0, row.z, 10 / 12, 20 / 12, 10 / 12, COLORS.tree);
    }
    const size = ANIMAL_SIZES[this.animal]!;
    const bob = Math.sin(time * Math.PI * 2 / VIEW.IDLE_PERIOD_S) * VIEW.IDLE_BOB;
    this.put(this.animals, this.animalX + this.animalSwap, Math.abs(this.animalSwap) / 2 + bob, this.animalZ,
      size[0] / 12, size[1] / 12, size[2] / 12, COLORS.animals[this.animal]!);
    this.blob(this.animalX + this.animalSwap, this.animalZ, 0.45, 0.4);
    for (let i = 0; i < 3; i++) this.put(this.podium, VIEW.PODIUM_X + i - 1, 0, 1, 1, i === 1 ? 1 : 0.5, 1, COLORS.yellow);
    this.obstacles.instanceMatrix.needsUpdate = this.vehicles.instanceMatrix.needsUpdate = this.logs.instanceMatrix.needsUpdate = true;
    this.crates.instanceMatrix.needsUpdate = this.animals.instanceMatrix.needsUpdate = this.blobs.instanceMatrix.needsUpdate = this.podium.instanceMatrix.needsUpdate = true;
    this.obstacles.instanceColor!.needsUpdate = this.vehicles.instanceColor!.needsUpdate = this.logs.instanceColor!.needsUpdate = true;
    this.crates.instanceColor!.needsUpdate = this.animals.instanceColor!.needsUpdate = this.podium.instanceColor!.needsUpdate = true;
  }
}
