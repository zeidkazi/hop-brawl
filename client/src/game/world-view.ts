import {
  Box3, BoxGeometry, CircleGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Frustum,
  Group, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial,
  Object3D, Sphere, Vector3,
} from 'three';
import type { Camera } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANIMAL_SIZES, COLORS, CONFIG, HOME, RAIL, SOLO, STREET, VIEW, WORLD } from '../../../shared/config';
import type { DeathCause } from '../../../shared/movement';
import { laneItemX, trainWarning, trainX } from '../../../shared/hazards';
import { hash32, mulberry32 } from '../../../shared/rng';
import type { Row, RowKind } from '../../../shared/types';
import { generateRow } from '../../../shared/worldgen';
import type { Tier } from './quality';
import { Outlines } from './outlines';
import { normalizedModel } from './model-geometry';

const KINDS: readonly RowKind[] = ['grass', 'road', 'river', 'rail'];
const ROW_COLORS = [COLORS.grass, COLORS.road, COLORS.water, COLORS.rail];
const capacity = VIEW.POOL_ROWS * VIEW.PROPS_PER_ROW;

function whiteVertices(geometry: BoxGeometry | CircleGeometry): void {
  const data = new Float32Array(geometry.getAttribute('position').count * 3);
  data.fill(1);
  geometry.setAttribute('color', new Float32BufferAttribute(data, 3));
}

function groundGeometry(outside = false): ReturnType<typeof mergeGeometries> {
  const tiles: BoxGeometry[] = [];
  const random = mulberry32(CONFIG.HOME_DIORAMA_SEED);
  for (let x = VIEW.DECOR_MIN_X; x <= VIEW.DECOR_MAX_X; x++) {
    if ((x < 0 || x >= CONFIG.COLUMNS) !== outside) continue;
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
  readonly outlines = new Outlines();
  readonly standard = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  readonly lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  readonly grounds: InstancedMesh[] = [];
  readonly outsideGrounds: InstancedMesh[] = [];
  readonly boundaryPulse: InstancedMesh;
  readonly railPosts: InstancedMesh;
  readonly railLights: InstancedMesh;
  readonly headlights: InstancedMesh;
  boundarySide = 0; boundaryUntil = 0; boundaryWarning = 0;
  readonly obstacles: InstancedMesh;
  readonly vehicles: InstancedMesh;
  readonly trucks: InstancedMesh;
  readonly trees: InstancedMesh;
  readonly trains: InstancedMesh;
  readonly carriages: InstancedMesh;
  readonly logs: InstancedMesh;
  readonly crates: InstancedMesh;
  readonly animals: InstancedMesh;
  readonly blobs: InstancedMesh;
  readonly podium: InstancedMesh;
  readonly backdrop: InstancedMesh;
  readonly markings: InstancedMesh;
  readonly rows = Array.from({ length: VIEW.POOL_ROWS }, () => ({ z: NaN, groundIndex: 0, row: null as Row | null }));
  readonly waterUniform = { value: 0 };
  private readonly cube = new BoxGeometry(1, 1, 1);
  private readonly transform = new Object3D();
  private readonly color = new Color();
  private readonly matrix = new Matrix4();
  private readonly frustum = new Frustum();
  private readonly rowBounds = new Box3();
  private readonly palette = new Map<string, Color>();
  private hasView = false;
  private viewBottom = NaN;
  private readonly nearPoint = new Vector3();
  private readonly farPoint = new Vector3();
  private seed: number = CONFIG.HOME_DIORAMA_SEED;
  private preparedBottom = NaN;
  private requestedBottom = 0;
  private pending = false;
  private staticDirty = true;
  private readonly staticMeshes: InstancedMesh[] = [];
  private readonly uploadMeshes: InstancedMesh[] = [];
  private tier: Tier = 'high';
  private readonly groundCounts = new Int32Array(KINDS.length);
  private readonly waterMaterials: (MeshStandardMaterial | MeshLambertMaterial)[] = [];
  animal = 0;
  animalX = 4;
  animalZ = 1;
  animalSwap = 0;
  station = 'home';
  generatedRows = 0;
  modelsReady = false;
  actorVisible = true;
  showCrates = true;
  private readonly logDips = Array.from({ length: CONFIG.MAX_PLAYERS_PRIVATE }, () => ({ row: -1, index: -1, at: -Infinity }));
  dipLog(row: number, index: number, time: number): void {
    const slot = this.logDips.find(v => v.row === row && v.index === index)
      ?? this.logDips.reduce((oldest, v) => v.at < oldest.at ? v : oldest);
    slot.row = row; slot.index = index; slot.at = time;
  }
  logDip(row: number, index: number, time: number): number {
    const slot = this.logDips.find(v => v.row === row && v.index === index);
    const p = slot ? (time - slot.at) * 1000 / CONFIG.HOP_MS : 1;
    return p >= 0 && p < 1 ? SOLO.LOG_DIP * Math.sin(Math.PI * p) : 0;
  }
  deathCause: DeathCause | null = null;
  deathX = 0; deathZ = 0; deathProgress = 0;

  constructor() {
    for (const value of Object.values(COLORS)) {
      if (typeof value === 'string') this.palette.set(value, new Color(value));
      else for (const color of value) this.palette.set(color, new Color(color));
    }
    whiteVertices(this.cube);
    this.palette.set('#FFFFFF', new Color('#FFFFFF'));
    const geometry = groundGeometry()!;
    const outsideGeometry = groundGeometry(true)!;
    for (let i = 0; i < KINDS.length; i++) {
      const ground = new InstancedMesh(geometry, this.standard, VIEW.POOL_ROWS);
      ground.instanceMatrix.setUsage(DynamicDrawUsage);
      ground.receiveShadow = true;
      ground.boundingSphere = new Sphere(new Vector3(4, 0, -8), VIEW.FAR);
      ground.count = 0;
      this.root.add(ground);
      this.grounds.push(ground);
      const outside = new InstancedMesh(outsideGeometry, this.standard, VIEW.POOL_ROWS);
      for (let slot = 0; slot < VIEW.POOL_ROWS; slot++) {
        outside.setColorAt(slot, this.color.set('#FFFFFF')); ground.setColorAt(slot, this.color);
      }
      outside.instanceMatrix.setUsage(DynamicDrawUsage); outside.receiveShadow = true;
      outside.boundingSphere = ground.boundingSphere.clone(); outside.count = 0;
      this.root.add(outside); this.outsideGrounds.push(outside);
    }
    this.boundaryPulse = new InstancedMesh(this.cube, new MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: VIEW.BOUNDARY_PULSE_ALPHA, depthWrite: false }), 2);
    this.boundaryPulse.count = 0; this.boundaryPulse.frustumCulled = false; this.root.add(this.boundaryPulse);
    this.railPosts = this.batch(VIEW.POOL_ROWS * 2);
    this.railLights = this.batch(VIEW.POOL_ROWS * 4); this.headlights = this.batch(VIEW.POOL_ROWS);
    for (const glow of [this.railLights, this.headlights]) {
      glow.material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: RAIL.GLOW_ALPHA, toneMapped: false, depthWrite: false });
      glow.castShadow = false; glow.frustumCulled = false;
    }
    this.obstacles = this.batch(capacity);
    this.vehicles = this.batch(capacity);
    this.trucks = this.batch(capacity); this.trees = this.batch(capacity);
    this.trains = this.batch(VIEW.POOL_ROWS); this.carriages = this.batch(VIEW.POOL_ROWS * 3);
    this.logs = this.batch(capacity);
    this.crates = this.batch(VIEW.POOL_ROWS);
    this.animals = this.batch(CONFIG.MAX_PLAYERS_PRIVATE);
    this.podium = this.batch(CONFIG.MAX_PLAYERS_PRIVATE);
    this.backdrop = this.batch(1); this.backdrop.castShadow = false;
    this.markings = this.batch(VIEW.POOL_ROWS * (VIEW.DECOR_MAX_X - VIEW.DECOR_MIN_X + 1) * 4); this.markings.castShadow = false;
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
    this.staticMeshes.push(this.obstacles, this.trees, this.crates, this.railPosts, this.podium);
    this.root.traverse(node => { if (node instanceof InstancedMesh) { node.updateMatrix(); node.matrixAutoUpdate = false; this.uploadMeshes.push(node); } });
    for (const mesh of this.staticMeshes) mesh.userData.staticBatch = true;
    this.prepareWindow(0);
    this.update(0);
    this.outlines.add(this.animals, 'animal'); this.outlines.add(this.vehicles, 'vehicle');
    this.outlines.add(this.logs, 'prop'); this.outlines.add(this.crates, 'prop');
    this.outlines.add(this.trucks, 'vehicle'); this.outlines.add(this.trains, 'vehicle'); this.outlines.add(this.carriages, 'vehicle'); this.outlines.add(this.trees, 'prop');
  }

  installModels(models: ReadonlyMap<string, Group>): void {
    if (this.modelsReady) return;
    for (const [mesh, name] of [[this.vehicles, 'car'], [this.trucks, 'truck'], [this.trees, 'oak'],
      [this.logs, 'log'], [this.crates, 'crate'], [this.trains, 'train_engine'], [this.carriages, 'train_carriage'], [this.railPosts, 'rail_post']] as const) {
      mesh.geometry = normalizedModel(models.get(name)!);
    }
    // Hulls share their source geometry; refresh their references after replacing the placeholders.
    this.root.traverse(node => { if (node.userData.outline && node instanceof InstancedMesh) {
      const source = node.parent;
      if (source instanceof InstancedMesh) node.geometry = source.geometry.clone().scale(STREET.OUTLINE_SCALE, STREET.OUTLINE_SCALE, STREET.OUTLINE_SCALE);
    } });
    this.modelsReady = true;
  }
  readonly rowAt = (z: number): Row => {
    const slot = this.rows[((z % VIEW.POOL_ROWS) + VIEW.POOL_ROWS) % VIEW.POOL_ROWS]!;
    if (slot.z !== z || !slot.row) throw new Error(`Row ${z} is outside the prepared window`);
    return slot.row;
  };

  private batch(size: number): InstancedMesh {
    const mesh = new InstancedMesh(this.cube, this.standard, size);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.castShadow = false;
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
    const bottom = Math.floor(Math.min(camZ, Number.isFinite(this.viewBottom) ? this.viewBottom : camZ)) - WORLD.STREAM_BEHIND_ROWS;
    if (bottom === this.preparedBottom) return;
    this.preparedBottom = bottom; this.staticDirty = true;
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
      slot.groundIndex = index;
      this.groundCounts[kind] = index + 1;
      const mesh = this.grounds[kind]!;
      this.matrix.makeTranslation(0, 0, -z);
      mesh.setMatrixAt(index, this.matrix);
      this.color.set(row.kind === 'grass' && z % 2 ? COLORS.grassAlt : ROW_COLORS[kind]!);
      mesh.setColorAt(index, this.color);
      const outside = this.outsideGrounds[kind]!;
      this.matrix.makeTranslation(0, -VIEW.OUTSIDE_DROP, -z); outside.setMatrixAt(index, this.matrix);
      this.darkenOutside(); outside.setColorAt(index, this.color);
    }
    for (let i = 0; i < this.grounds.length; i++) {
      const mesh = this.grounds[i]!;
      mesh.count = this.groundCounts[i]!;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      const outside = this.outsideGrounds[i]!; outside.count = mesh.count;
      outside.instanceMatrix.needsUpdate = true; outside.instanceColor!.needsUpdate = true;
    }
    // Batch bounds follow the recycled window even thousands of rows from home.
    for (const mesh of [...this.grounds, ...this.outsideGrounds, this.obstacles, this.vehicles, this.trucks, this.trees, this.trains, this.carriages, this.railPosts, this.logs, this.crates, this.blobs, this.markings]) {
      mesh.boundingSphere!.center.set(4, 0, -camZ - CONFIG.VIEW_ROWS / 2);
      mesh.boundingSphere!.radius = VIEW.POOL_ROWS;
    }
  }

  private readonly flushWindow = (): void => { this.pending = false; this.prepareWindow(this.requestedBottom); };
  requestWindow(camZ: number): void {
    this.requestedBottom = camZ;
    if (!this.pending && Math.floor(Math.min(camZ, Number.isFinite(this.viewBottom) ? this.viewBottom : camZ)) - WORLD.STREAM_BEHIND_ROWS !== this.preparedBottom) {
      this.pending = true;
      queueMicrotask(this.flushWindow);
    }
  }

  reset(seed: number): void {
    this.seed = seed;
    for (const dip of this.logDips) { dip.row = dip.index = -1; dip.at = -Infinity; }
    this.viewBottom = NaN;
    this.preparedBottom = NaN;
    for (const slot of this.rows) slot.z = NaN;
    this.prepareWindow(0);
  }

  applyTier(tier: Tier): void {
    this.tier = tier;
    this.outlines.applyTier(tier);
    const material = tier === 'high' ? this.standard : this.lambert;
    for (const mesh of [...this.grounds, ...this.outsideGrounds]) mesh.material = material;
    for (const mesh of [this.obstacles, this.vehicles, this.trucks, this.trees, this.trains, this.carriages, this.railPosts, this.logs, this.crates, this.animals, this.podium, this.backdrop, this.markings]) mesh.material = material;
    this.grounds[2]!.material = tier === 'low' ? this.lambert : this.waterMaterials[tier === 'high' ? 0 : 1]!;
    this.obstacles.castShadow = this.logs.castShadow = this.crates.castShadow = this.podium.castShadow = this.railPosts.castShadow = false;
    this.vehicles.castShadow = this.animals.castShadow = tier !== 'low';
    this.trucks.castShadow = this.trains.castShadow = this.carriages.castShadow = tier !== 'low'; this.trees.castShadow = false;
    this.blobs.visible = tier === 'low';
  }

  private darkenOutside(): void {
    const gray = this.color.r * .2126 + this.color.g * .7152 + this.color.b * .0722;
    this.color.setRGB((this.color.r + (gray - this.color.r) * VIEW.OUTSIDE_DESATURATION) * VIEW.OUTSIDE_BRIGHTNESS,
      (this.color.g + (gray - this.color.g) * VIEW.OUTSIDE_DESATURATION) * VIEW.OUTSIDE_BRIGHTNESS,
      (this.color.b + (gray - this.color.b) * VIEW.OUTSIDE_DESATURATION) * VIEW.OUTSIDE_BRIGHTNESS);
  }
  private put(mesh: InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, facing = 0): void {
    if (mesh.userData.staticBatch && !this.staticDirty) return;
    const index = mesh.count++;
    this.transform.position.set(x, y + sy / 2, -z);
    this.transform.scale.set(sx, sy, sz);
    this.transform.rotation.set(0, facing, 0);
    this.transform.updateMatrix();
    mesh.setMatrixAt(index, this.transform.matrix);
    mesh.setColorAt(index, this.palette.get(color)!);
  }

  private blob(x: number, z: number, sx: number, sz: number): void {
    if (this.tier !== 'low') return;
    this.transform.position.set(x, VIEW.BLOB_Y, -z);
    this.transform.scale.set(sx, 1, sz);
    this.transform.updateMatrix();
    this.blobs.setMatrixAt(this.blobs.count++, this.transform.matrix);
  }

  setView(camera: Camera): void {
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    this.viewBottom = Infinity;
    for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) {
      this.nearPoint.set(x, y, -1).unproject(camera);
      this.farPoint.set(x, y, 1).unproject(camera).sub(this.nearPoint);
      const t = -this.nearPoint.y / this.farPoint.y;
      this.viewBottom = Math.min(this.viewBottom, -(this.nearPoint.z + this.farPoint.z * t));
    }
    this.hasView = true;
  }

  update(time: number): void {
    this.waterUniform.value = time;
    this.vehicles.count = this.logs.count = this.animals.count = this.blobs.count = 0;
    if (this.staticDirty) for (const mesh of this.staticMeshes) mesh.count = 0;
    this.trucks.count = this.trains.count = this.carriages.count = 0;
    this.railLights.count = this.headlights.count = 0;
    this.markings.count = 0; this.boundaryPulse.count = 0;
    this.backdrop.count = 0;
    this.put(this.backdrop, 4, -VIEW.GROUND_DEPTH * 2, this.requestedBottom, VIEW.FAR, VIEW.GROUND_DEPTH, VIEW.FAR, COLORS.grass);
    this.backdrop.instanceMatrix.needsUpdate = true; this.backdrop.instanceColor!.needsUpdate = true;
    this.backdrop.boundingSphere!.center.set(4, 0, -this.requestedBottom); this.backdrop.boundingSphere!.radius = VIEW.FAR;
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!.row!;
      for (let side = -1; side <= 1; side += 2) {
        const warning = this.boundaryWarning === side && Math.sin(time * Math.PI * 2 * VIEW.LOG_EDGE_PULSE_HZ) > 0;
        this.put(this.markings, side < 0 ? -.5 : 8.5, 0, row.z, VIEW.BOUNDARY_WIDTH,
          row.kind === 'grass' ? VIEW.BOUNDARY_KERB_HEIGHT : STREET.DASH_HEIGHT, 1,
          warning ? COLORS.red : row.kind === 'rail' ? COLORS.rock : COLORS.cream);
      }
      this.rowBounds.min.set(VIEW.DECOR_MIN_X, -VIEW.GROUND_DEPTH, -row.z - 0.5);
      this.rowBounds.max.set(VIEW.DECOR_MAX_X + 1, 2, -row.z + 0.5);
      // Static instances remain valid across sub-row camera motion; GPU frustum bounds cull them.
      if (!this.staticDirty && this.hasView && !this.frustum.intersectsBox(this.rowBounds)) continue;
      if (row.kind === 'grass') {
        for (let j = 0; j < row.obstacles.length; j++) {
          const obstacle = row.obstacles[j]!;
          const tree = obstacle.kind === 'tree';
          this.put(tree ? this.trees : this.obstacles, obstacle.column, 0, row.z, (tree ? 14 : 8) / 12, (tree ? 20 : 6) / 12, tree ? VIEW.TREE_ROW_DEPTH : 8 / 12, tree && this.modelsReady ? '#FFFFFF' : tree ? COLORS.tree : COLORS.rock);
        }
        if (this.showCrates && row.crate) this.put(this.crates, row.crate.column, 0, row.z, 10 / 12, 10 / 12, 10 / 12, this.modelsReady ? '#FFFFFF' : COLORS.crate);
      } else if (row.kind === 'road') {
        for (let side = -1; side <= 1; side += 2) {
          const z = row.z + side;
          const neighbour = this.rows[((z % VIEW.POOL_ROWS) + VIEW.POOL_ROWS) % VIEW.POOL_ROWS]!;
          const adjacentRoad = neighbour.z === z && neighbour.row?.kind === 'road';
          if (!adjacentRoad) for (let x = 0; x < CONFIG.COLUMNS; x++) this.put(this.markings, x, 0, row.z + side * STREET.KERB_ROW_OFFSET,
            1, STREET.KERB_HEIGHT, STREET.KERB_WIDTH, x % 2 ? COLORS.cream : COLORS.red);
          else if (side === 1) for (let x = 0; x < CONFIG.COLUMNS; x += 2) this.put(this.markings, x, STREET.DASH_ELEVATION, row.z + .5,
            HOME.DASH_LENGTH, STREET.DASH_HEIGHT, HOME.DASH_WIDTH, COLORS.yellow);
        }
        for (let j = 0; j < row.vehicles.length; j++) {
          const car = row.vehicles[j]!;
          const x = laneItemX(row, car, time);
          this.put(car.kind === 'car' ? this.vehicles : this.trucks, x, 0, row.z, car.length, (car.kind === 'car' ? 9 : 13) / 12, 10 / 12, this.modelsReady ? '#FFFFFF' : COLORS.players[j % COLORS.players.length]!, row.direction < 0 ? Math.PI : 0);
          this.blob(x, row.z, car.length / 2, 0.45);
        }
      } else if (row.kind === 'river') {
        for (let j = 0; j < row.logs.length; j++) {
          const log = row.logs[j]!;
          this.put(this.logs, laneItemX(row, log, time), -0.1 - this.logDip(row.z, j, time), row.z, log.length, 5 / 12, 10 / 12, this.modelsReady ? '#FFFFFF' : COLORS.log);
        }
      } else {
        for (let x = VIEW.DECOR_MIN_X; x <= VIEW.DECOR_MAX_X; x += RAIL.SLEEPER_SPACING)
          this.put(this.markings, x, x < 0 || x > CONFIG.COLUMNS - 1 ? -VIEW.OUTSIDE_DROP : 0,
            row.z, RAIL.SLEEPER_WIDTH, RAIL.SLEEPER_HEIGHT, RAIL.SLEEPER_LENGTH, COLORS.sleeper);
        for (let side = -1; side <= 1; side += 2) {
          this.put(this.markings, 4, RAIL.SLEEPER_HEIGHT, row.z + side * RAIL.RAIL_OFFSET,
            CONFIG.COLUMNS, RAIL.RAIL_HEIGHT, RAIL.RAIL_WIDTH, COLORS.steel);
          for (let edge = -1; edge <= 1; edge += 2) {
            const start = edge < 0 ? VIEW.DECOR_MIN_X - .5 : CONFIG.COLUMNS - .5;
            const end = edge < 0 ? -.5 : VIEW.DECOR_MAX_X + .5;
            this.put(this.markings, (start + end) / 2, RAIL.SLEEPER_HEIGHT - VIEW.OUTSIDE_DROP,
              row.z + side * RAIL.RAIL_OFFSET, end - start, RAIL.RAIL_HEIGHT, RAIL.RAIL_WIDTH, COLORS.steel);
          }
          this.put(this.railPosts, RAIL.POST_X[side < 0 ? 0 : 1], 0, row.z, RAIL.POST_WIDTH, RAIL.POST_HEIGHT, RAIL.POST_DEPTH, '#FFFFFF', Math.PI);
        }
        const x = trainX(row, time);
        if (x !== null) {
          this.put(this.headlights, x + row.direction * WORLD.TRAIN_LENGTH / 2, RAIL.HEADLIGHT_Y, row.z,
            RAIL.HEADLIGHT_LENGTH, RAIL.HEADLIGHT_SIZE, RAIL.HEADLIGHT_SIZE, COLORS.cream);
          this.put(this.trains, x + row.direction * 4.5, 0, row.z, 3, 16 / 12, 11 / 12, this.modelsReady ? '#FFFFFF' : COLORS.red, row.direction < 0 ? Math.PI : 0);
          for (let j = 0; j < 3; j++) this.put(this.carriages, x + row.direction * (1.5 - j * 3), 0, row.z, 3, 14 / 12, 11 / 12, this.modelsReady ? '#FFFFFF' : COLORS.blue);
        }
        const warning = trainWarning(row, time), flash = Math.floor(time * SOLO.WARNING_FLASH_HZ * 2) % 2;
        if (warning) for (const px of RAIL.POST_X) {
          this.put(this.railLights, px + (flash ? RAIL.LAMP_X : -RAIL.LAMP_X), RAIL.LAMP_Y, row.z - RAIL.LAMP_Z,
            RAIL.LAMP_SIZE, RAIL.LAMP_SIZE, RAIL.LAMP_SIZE, COLORS.red);
        }
        this.color.set(COLORS.rail).lerp(this.palette.get(COLORS.red)!, warning ? RAIL.WARNING_TINT * (.5 + .5 * Math.sin(time * Math.PI * 2 * SOLO.WARNING_FLASH_HZ)) : 0);
        this.grounds[3]!.setColorAt(this.rows[i]!.groundIndex, this.color);
        this.darkenOutside(); this.outsideGrounds[3]!.setColorAt(this.rows[i]!.groundIndex, this.color);
        this.grounds[3]!.instanceColor!.needsUpdate = this.outsideGrounds[3]!.instanceColor!.needsUpdate = true;
      }
      // Decorative scenery uses stable row hashes and cannot be stood on.
      if (row.kind === 'grass') this.put(this.trees, (hash32(this.seed, row.z) & 1) ? -3 : 11, 0, row.z, 14 / 12, 20 / 12, VIEW.TREE_ROW_DEPTH, this.modelsReady ? '#FFFFFF' : COLORS.tree);
    }
    const size = ANIMAL_SIZES[this.animal]!;
    if (this.deathCause === 'FLATTENED!') {
      for (let side = -1; side <= 1; side += 2) this.put(this.markings, this.deathX + side * SOLO.TIRE_GAP / 2, 0,
        this.deathZ, SOLO.TIRE_WIDTH, SOLO.DECAL_HEIGHT, SOLO.TIRE_LENGTH, COLORS.ink);
    } else if (this.deathCause === 'SPLASH!' && this.deathProgress < 1) {
      const radius = SOLO.RIPPLE_START + this.deathProgress * SOLO.RIPPLE_GROW;
      for (let i = 0; i < SOLO.SPLASH_PARTS; i++) {
        const angle = i / SOLO.SPLASH_PARTS * Math.PI * 2;
        this.put(this.markings, this.deathX + Math.cos(angle) * radius, SOLO.DECAL_HEIGHT,
          this.deathZ + Math.sin(angle) * radius, SOLO.RIPPLE_WIDTH * (1 - this.deathProgress), SOLO.DECAL_HEIGHT,
          SOLO.RIPPLE_WIDTH * (1 - this.deathProgress), COLORS.cream);
      }
    }
    if (time < this.boundaryUntil && this.boundarySide) {
      this.transform.position.set(this.boundarySide < 0 ? -.5 : 8.5, VIEW.BOUNDARY_WALL_HEIGHT / 2, -this.animalZ);
      this.transform.rotation.set(0, 0, 0); this.transform.scale.set(VIEW.BOUNDARY_WIDTH, VIEW.BOUNDARY_WALL_HEIGHT, 1);
      this.transform.updateMatrix(); this.boundaryPulse.setMatrixAt(0, this.transform.matrix); this.boundaryPulse.count = 1;
    }
    this.boundaryPulse.instanceMatrix.needsUpdate = true;
    this.markings.instanceMatrix.needsUpdate = true; this.markings.instanceColor!.needsUpdate = true;
    this.animals.boundingSphere!.center.set(this.animalX, 0, -this.animalZ);
    this.animals.boundingSphere!.radius = VIEW.POOL_ROWS;
    const bob = Math.sin(time * Math.PI * 2 / VIEW.IDLE_PERIOD_S) * VIEW.IDLE_BOB;
    this.put(this.animals, this.animalX + this.animalSwap, Math.abs(this.animalSwap) / 2 + bob, this.animalZ,
      size[0] / 12, size[1] / 12, size[2] / 12, COLORS.animals[this.animal]!);
    this.blob(this.animalX + this.animalSwap, this.animalZ, 0.45, 0.4);
    if (!this.actorVisible) this.animals.count = 0;
    for (let i = 0; i < 3; i++) this.put(this.podium, VIEW.PODIUM_X + i - 1, 0, 1, 1, i === 1 ? 1 : 0.5, 1, COLORS.yellow);
    if (this.tier === 'low') {
      this.color.copy(this.palette.get(COLORS.water)!).multiplyScalar(1 + Math.sin(time * VIEW.WATER_SPEED) * VIEW.WATER_AMPLITUDE);
      const water = this.grounds[2]!;
      for (let i = 0; i < water.count; i++) water.setColorAt(i, this.color);
      if (water.instanceColor) water.instanceColor.needsUpdate = true;
    }
    for (const mesh of this.uploadMeshes) {
      if (this.grounds.includes(mesh) || this.outsideGrounds.includes(mesh)) continue;
      if (mesh.userData.staticBatch && !this.staticDirty) continue;
      if (mesh.count) {
        mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, mesh.count * 16); mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) { mesh.instanceColor.clearUpdateRanges(); mesh.instanceColor.addUpdateRange(0, mesh.count * 3); mesh.instanceColor.needsUpdate = true; }
      }
    }
    this.staticDirty = false;
    this.outlines.sync();
  }
}
