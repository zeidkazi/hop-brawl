import { gsap } from 'gsap';
import {
  Box3, BoxGeometry, BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, Group, InstancedMesh,
  Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Sphere, Vector3,
} from 'three';
import type { PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ANIMALS, COLORS, CONFIG, HOME, STREET, VIEW } from '../../../shared/config';
import { mulberry32 } from '../../../shared/rng';
import type { Tier } from './quality';
import { Outlines } from './outlines';
import { Arena } from './arena';

type Moving = { batch: InstancedMesh; index: number; x: number; z: number; speed: number; scale: number };

/** Loaded once into the persistent world scene. Repeated scenery is instanced. */
export class HomeScene {
  readonly root = new Group();
  readonly outlines = new Outlines();
  arena: Arena | null = null;
  private warming = false;
  readonly logo = new Group();
  readonly animalRoot = new Group();
  readonly standard = new MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  readonly lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private readonly gloveStandard = this.standard.clone();
  private readonly gloveLambert = this.lambert.clone();
  private readonly flatWater = this.lambert.clone();
  readonly animals: Group[] = [];
  readonly eyes: Object3D[][] = [];
  readonly tails: Object3D[][] = [];
  readonly gloves: Object3D[][] = [];
  readonly labels: Object3D[] = [];
  readonly arrows: Object3D[] = [];
  private readonly meshes: Mesh[] = [];
  private readonly moving: Moving[] = [];
  private readonly transform = new Object3D();
  private readonly point = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private readonly forward = new Vector3();
  private readonly logoBase = new Vector3();
  private readonly targets = new Float64Array(6);
  private readonly logoEyes: Object3D[] = [];
  private intro: gsap.core.Timeline | null = null;
  private blobs: InstancedMesh | null = null;
  private water: Mesh | null = null;
  private readonly waterTime = { value: 0 };
  private readonly waterMaterials: (MeshStandardMaterial | MeshLambertMaterial)[] = [];
  private selected = 0;
  private logoWidth = 1;
  private reduced = false;
  swap = 0;
  onTargets: ((points: Float64Array) => void) | null = null;

  async load(): Promise<void> {
    this.setPlayerColor(0);
    const loader = new GLTFLoader();
    const names = [...ANIMALS, 'logo', 'oak', 'car', 'hatchback', 'taxi', 'truck', 'log', 'home_controls', 'arena'];
    const loaded = await Promise.all(names.map(async name => [name, (await loader.loadAsync(`/models/${name}.glb`)).scene] as const));
    const assets = new Map(loaded);
    for (const [name, model] of assets) {
      model.traverse(obj => {
        if (!(obj instanceof Mesh)) return;
        const old = obj.material;
        obj.material = this.standard; obj.castShadow = obj.receiveShadow = true;
        obj.userData.shadowKind = ANIMALS.includes(name as typeof ANIMALS[number]) ? 'animal' : 'prop';
        if (!Array.isArray(old)) old.dispose();
      });
    }
    for (const name of ANIMALS) {
      const animal = assets.get(name)!;
      this.animals.push(animal); this.animalRoot.add(animal);
      const eyes: Object3D[] = [], tails: Object3D[] = [], gloves: Object3D[] = [];
      animal.traverse(obj => { if (obj.userData.part === 'eyes') eyes.push(obj); if (obj.userData.part === 'tail') tails.push(obj); if (obj.userData.part?.startsWith('glove_')) gloves.push(obj); });
      this.eyes.push(eyes); this.tails.push(tails);
      this.gloves.push(gloves);
      animal.visible = false;
    }
    this.animalRoot.position.set(4, 0, -1);
    this.animalRoot.rotation.y = HOME.ANIMAL_YAW;
    this.animalRoot.scale.setScalar(HOME.ANIMAL_SCALE);
    this.root.add(this.animalRoot);
    const logo = assets.get('logo')!;
    const logoBounds = new Box3().setFromObject(logo);
    const center = logoBounds.getCenter(new Vector3());
    this.logoWidth = logoBounds.max.x - logoBounds.min.x;
    logo.position.sub(center);
    this.logo.add(logo); this.root.add(this.logo);
    logo.traverse(obj => { if (obj.name === 'logo_chicken_eyes') this.logoEyes.push(obj); obj.userData.shadowKind = 'logo'; });

    const controls = assets.get('home_controls')!;
    const sign = new Group();
    sign.add(controls.getObjectByName('home_controls_sign')!);
    for (const name of ANIMALS) {
      const label = controls.getObjectByName(`label_${name}`)!;
      this.labels.push(label); sign.add(label); label.visible = false;
    }
    sign.rotation.y = Math.PI; sign.scale.setScalar(HOME.SIGN_SCALE);
    sign.position.set(HOME.SIGN_X, 0, HOME.SIGN_Z); this.root.add(sign);
    const sourceArrow = controls.getObjectByName('home_controls_arrow') as Mesh;
    // Center the exported arrow geometry before making two shared-geometry copies.
    sourceArrow.geometry = sourceArrow.geometry.clone(); sourceArrow.geometry.center();
    for (const direction of [-1, 1]) {
      const arrow = sourceArrow.clone(); arrow.scale.set(-HOME.ARROW_SCALE * direction, HOME.ARROW_SCALE, HOME.ARROW_SCALE);
      this.arrows.push(arrow); this.root.add(arrow);
    }
    this.buildGround();
    this.arena = new Arena(assets.get('arena')!, this.standard, this.lambert); this.root.add(this.arena.root);
    const random = mulberry32(CONFIG.HOME_DIORAMA_SEED);
    const trees = this.batch(assets.get('oak')!, HOME.TREE_COUNT);
    for (let i = 0; i < trees.count; i++) {
      const hero = HOME.HERO_TREES[i];
      let z = hero?.[1] ?? Math.floor(-20 + random() * 40);
      while (HOME.ROAD_ROWS.includes(-Math.round(z) as never) || HOME.RIVER_ROWS.includes(-Math.round(z) as never)) z++;
      this.place(trees, i, hero?.[0] ?? random() * 8, 0, z, 1 + random() * 0.35);
    }
    for (const [kind, name] of ['car', 'hatchback', 'taxi', 'truck'].entries()) {
      const cars = this.batch(assets.get(name)!, HOME.VEHICLE_COUNT / 4);
      cars.userData.shadowKind = 'vehicle';
      for (let i = 0; i < cars.count; i++) {
        const row = HOME.ROAD_ROWS[(i + kind) % HOME.ROAD_ROWS.length]!;
        this.moving.push({ batch: cars, index: i, x: HOME.LOOP_LEFT + i * HOME.LOOP_WIDTH / 3 + kind, z: -row,
          speed: HOME.TRAFFIC_SPEED * (row % 2 ? 1 : -1), scale: 1 });
      }
    }
    const logs = this.batch(assets.get('log')!, HOME.LOG_COUNT);
    logs.userData.shadowKind = 'log';
    for (let i = 0; i < logs.count; i++) this.moving.push({ batch: logs, index: i, x: HOME.LOOP_LEFT + Math.floor(i / 3) * 8,
      z: -HOME.RIVER_ROWS[i % 3]!, speed: HOME.LOG_SPEED * (i % 3 === 1 ? -1 : 1), scale: 3 });
    const circle = new CircleGeometry(1, VIEW.BLOB_SEGMENTS); circle.rotateX(-Math.PI / 2);
    this.blobs = new InstancedMesh(circle, new MeshBasicMaterial({ color: 0, transparent: true, opacity: VIEW.BLOB_OPACITY, depthWrite: false }), HOME.VEHICLE_COUNT + 1);
    this.blobs.boundingSphere = new Sphere(new Vector3(4, 0, 0), HOME.GROUND_WIDTH);
    this.root.add(this.blobs);
    this.root.traverse(obj => { if (obj instanceof Mesh && !obj.userData.arena && !obj.userData.outline) this.meshes.push(obj); });
    for (const mesh of this.meshes) {
      const kind = mesh.userData.shadowKind;
      if (kind === 'animal' || kind === 'vehicle' || kind === 'log') this.outlines.add(mesh, kind === 'log' ? 'prop' : kind);
    }
    this.select(0); this.update(0);
  }

  private batch(model: Group, count: number): InstancedMesh {
    model.updateMatrixWorld(true);
    const pieces: BufferGeometry[] = [];
    model.traverse(obj => {
      if (!(obj instanceof Mesh)) return;
      const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
      // Shared vertex-color schema makes multimesh sources safe to merge.
      geometry.deleteAttribute('uv'); geometry.deleteAttribute('uv1');
      pieces.push(geometry);
    });
    const geometry = mergeGeometries(pieces)!;
    for (const piece of pieces) piece.dispose();
    const mesh = new InstancedMesh(geometry, this.standard, count);
    mesh.boundingSphere = new Sphere(new Vector3(4, 0, 0), HOME.GROUND_WIDTH);
    mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }

  private place(mesh: InstancedMesh, index: number, x: number, y: number, z: number, scale = 1, facing = 0, length = 1): void {
    this.transform.position.set(x, y, z); this.transform.rotation.set(0, facing, 0);
    this.transform.scale.set(scale * length, scale, scale); this.transform.updateMatrix();
    mesh.setMatrixAt(index, this.transform.matrix);
  }

  private buildGround(): void {
    const random = mulberry32(CONFIG.HOME_DIORAMA_SEED);
    const cubes: BufferGeometry[] = [];
    const color = new Color();
    for (let z = HOME.GROUND_MIN; z <= HOME.GROUND_MAX; z++) {
      const road = HOME.ROAD_ROWS.includes(z as never), river = HOME.RIVER_ROWS.includes(z as never);
      for (let x = -HOME.GROUND_WIDTH / 2; x < HOME.GROUND_WIDTH / 2; x++) {
        const cube = new BoxGeometry(1, VIEW.GROUND_DEPTH, 1);
        cube.translate(x + 4, -VIEW.GROUND_DEPTH / 2 - (river ? VIEW.GROUND_DEPTH : 0), -z);
        color.set(road ? COLORS.road : river ? COLORS.water : z % 2 ? COLORS.grass : COLORS.grassAlt);
        color.multiplyScalar(1 - VIEW.TILE_NOISE + random() * VIEW.TILE_NOISE * 2);
        const data = new Float32Array(cube.attributes.position!.count * 3);
        for (let i = 0; i < data.length; i += 3) color.toArray(data, i);
        cube.setAttribute('color', new Float32BufferAttribute(data, 3)); cubes.push(cube);
      }
    }
    const ground = new Mesh(mergeGeometries(cubes)!, this.standard); ground.receiveShadow = true;
    for (const cube of cubes) cube.dispose();
    this.root.add(ground);
    const geometry = new BoxGeometry(HOME.DASH_LENGTH, 0.015, HOME.DASH_WIDTH);
    const white = new Float32Array(geometry.attributes.position!.count * 3); color.set(COLORS.yellow);
    for (let i = 0; i < white.length; i += 3) color.toArray(white, i);
    geometry.setAttribute('color', new Float32BufferAttribute(white, 3));
    const dashes = new InstancedMesh(geometry, this.standard, HOME.GROUND_WIDTH * 2);
    for (let i = 0; i < dashes.count; i++) this.place(dashes, i, -HOME.GROUND_WIDTH / 2 + (i % HOME.GROUND_WIDTH) * 2, 0, i < HOME.GROUND_WIDTH ? 3.5 : -4.5);
    this.root.add(dashes);
    const kerbGeometry = new BoxGeometry(1, STREET.KERB_HEIGHT, STREET.KERB_WIDTH);
    const kerbColors = new Float32Array(kerbGeometry.attributes.position!.count * 3); kerbColors.fill(1);
    kerbGeometry.setAttribute('color', new Float32BufferAttribute(kerbColors, 3));
    const kerbs = new InstancedMesh(kerbGeometry, this.standard, HOME.GROUND_WIDTH * 4);
    for (let i = 0; i < kerbs.count; i++) {
      const edge = [2.5, 4.5, -3.5, -5.5][Math.floor(i / HOME.GROUND_WIDTH)]!;
      this.place(kerbs, i, i % HOME.GROUND_WIDTH - HOME.GROUND_WIDTH / 2 + 4, STREET.KERB_HEIGHT / 2, edge);
      kerbs.setColorAt(i, color.set(i % 2 ? COLORS.cream : COLORS.players[0]));
    }
    this.root.add(kerbs);
    const waterGeometry = new PlaneGeometry(HOME.GROUND_WIDTH, HOME.RIVER_ROWS.length, HOME.GROUND_WIDTH, HOME.RIVER_ROWS.length);
    waterGeometry.rotateX(-Math.PI / 2); waterGeometry.translate(4, -VIEW.WATER_AMPLITUDE, -HOME.RIVER_ROWS[1]);
    const waterColors = new Float32Array(waterGeometry.attributes.position!.count * 3);
    color.set(COLORS.water);
    for (let i = 0; i < waterColors.length; i += 3) color.toArray(waterColors, i);
    waterGeometry.setAttribute('color', new Float32BufferAttribute(waterColors, 3));
    for (const base of [this.standard, this.lambert]) {
      const material = base.clone();
      material.onBeforeCompile = shader => {
        shader.uniforms.uTime = this.waterTime;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed.y += sin(position.x * ${VIEW.WATER_FREQUENCY.toFixed(1)} + uTime * ${VIEW.WATER_SPEED.toFixed(1)}) * ${VIEW.WATER_AMPLITUDE};`);
      };
      material.customProgramCacheKey = () => 'home-water'; this.waterMaterials.push(material);
    }
    this.water = new Mesh(waterGeometry, this.waterMaterials[0]); this.water.receiveShadow = true; this.root.add(this.water);
  }

  select(index: number): void {
    this.selected = index;
    for (let i = 0; i < this.animals.length; i++) { this.animals[i]!.visible = i === index; this.labels[i]!.visible = i === index; }
  }

  applyTier(tier: Tier): void {
    this.outlines.applyTier(tier);
    this.arena?.applyTier(tier); if (this.warming) this.arena?.warmAll();
    for (const mesh of this.meshes) {
      if (mesh === this.blobs) continue;
      mesh.material = mesh.userData.player_color ? (tier === 'high' ? this.gloveStandard : this.gloveLambert) : (tier === 'high' ? this.standard : this.lambert);
      mesh.castShadow = mesh.userData.shadowKind !== 'logo' && (tier === 'high' || (tier === 'medium' && ['animal', 'vehicle'].includes(mesh.userData.shadowKind as string)));
    }
    if (this.blobs) this.blobs.visible = tier === 'low';
    if (this.water) this.water.material = tier === 'low' ? this.flatWater : this.waterMaterials[tier === 'high' ? 0 : 1]!;
  }

  setPlayerColor(index: number): void {
    const color = COLORS.players[index] ?? COLORS.players[0];
    this.gloveStandard.color.set(color); this.gloveLambert.color.set(color);
  }

  warmAll(value: boolean): void {
    this.warming = value;
    if (value) this.arena?.warmAll();
    for (const animal of this.animals) animal.visible = value;
    for (const label of this.labels) label.visible = value;
    if (value) {
      for (const eyes of this.eyes) for (const eye of eyes) eye.visible = true;
      for (const eye of this.logoEyes) eye.visible = true;
    }
    if (!value) this.select(this.selected);
  }

  layout(camera: PerspectiveCamera): void {
    camera.updateMatrixWorld();
    const distance = camera.position.distanceTo(new Vector3(4, HOME.FOCUS_Y, -1));
    const height = 2 * Math.tan(camera.fov * Math.PI / 360) * distance;
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    this.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.logoBase.copy(camera.position).addScaledVector(this.forward, distance).addScaledVector(this.up, height * HOME.LOGO_NDC_Y / 2);
    this.logo.position.copy(this.logoBase); this.logo.quaternion.copy(camera.quaternion);
    this.logo.rotateX(HOME.LOGO_TILT_X); this.logo.rotateY(HOME.LOGO_TILT_Y);
    this.logo.scale.setScalar(Math.min(height * camera.aspect * HOME.LOGO_WIDTH_RATIO, height * HOME.LOGO_HEIGHT_RATIO) / this.logoWidth);
    for (let i = 0; i < this.arrows.length; i++) {
      const arrow = this.arrows[i]!;
      arrow.position.set(4, HOME.ARROW_HEIGHT, -1).addScaledVector(this.right, (i ? 1 : -1) * HOME.ARROW_OFFSET);
      arrow.quaternion.copy(camera.quaternion);
      this.point.copy(arrow.position).project(camera);
      this.targets[i * 2] = (this.point.x + 1) / 2; this.targets[i * 2 + 1] = (1 - this.point.y) / 2;
    }
    this.point.set(4, 0.65, -1).project(camera); this.targets[4] = (this.point.x + 1) / 2; this.targets[5] = (1 - this.point.y) / 2;
    this.onTargets?.(this.targets);
  }

  playIntro(): void {
    if (this.reduced) return;
    this.intro?.kill(); this.intro = gsap.timeline();
    let i = 0;
    for (const line of ['HOP', 'BRAWL']) for (const letter of line) {
      const node = this.logo.getObjectByName(`logo_${line}_${letter}`)!;
      const y = node.position.y;
      this.intro.fromTo(node.position, { y: y + HOME.LOGO_DROP }, { y, duration: HOME.LOGO_DROP_S, ease: 'bounce.out' }, i * HOME.LOGO_STAGGER_S);
      this.intro.fromTo(node.scale, { x: 0.85, y: 1.2 }, { x: 1, y: 1, duration: HOME.LOGO_DROP_S, ease: 'back.out(2)' }, i++ * HOME.LOGO_STAGGER_S);
    }
    const chicken = this.logo.getObjectByName('logo_chicken')!;
    this.intro.from(chicken.position, { y: chicken.position.y + HOME.LOGO_DROP, duration: HOME.CHICKEN_LAND_S, ease: 'bounce.out' });
  }

  setReduced(value: boolean): void { this.reduced = value; this.arena?.setReduced(value); if (value) this.intro?.progress(1); }

  update(time: number): void {
    this.waterTime.value = time;
    this.arena?.update(time);
    this.flatWater.color.setScalar(1 + Math.sin(time * VIEW.WATER_SPEED) * VIEW.WATER_AMPLITUDE);
    let blob = 1;
    let foam = 0;
    for (const item of this.moving) {
      const x = HOME.LOOP_LEFT + ((item.x - HOME.LOOP_LEFT + time * item.speed) % HOME.LOOP_WIDTH + HOME.LOOP_WIDTH) % HOME.LOOP_WIDTH;
      this.place(item.batch, item.index, x, 0, item.z, 1, item.speed < 0 ? Math.PI : 0, item.scale);
      item.batch.instanceMatrix.needsUpdate = true;
      if (item.scale > 1) {
        this.arena?.moveFoam(foam++, x - item.scale / 2, item.z);
        this.arena?.moveFoam(foam++, x + item.scale / 2, item.z);
      }
      if (this.blobs && item.scale === 1) {
        this.transform.position.set(x, VIEW.BLOB_Y, item.z); this.transform.rotation.set(0, 0, 0);
        this.transform.scale.set(0.5, 1, 0.4); this.transform.updateMatrix(); this.blobs.setMatrixAt(blob++, this.transform.matrix);
      }
    }
    const phase = time % HOME.HOP_PERIOD_S;
    const hop = !this.reduced && phase < HOME.HOP_DURATION_S ? Math.sin(phase / HOME.HOP_DURATION_S * Math.PI) * HOME.HOP_HEIGHT : 0;
    const bob = this.reduced ? 0 : Math.sin(time * Math.PI * 2 / VIEW.IDLE_PERIOD_S) * VIEW.IDLE_BOB;
    this.animalRoot.position.set(4 + this.swap, hop + bob + Math.abs(this.swap) / 2, -1);
    if (this.blobs) {
      this.transform.position.set(4 + this.swap, VIEW.BLOB_Y, -1); this.transform.rotation.set(0, 0, 0);
      this.transform.scale.set(0.6, 1, 0.5); this.transform.updateMatrix(); this.blobs.setMatrixAt(0, this.transform.matrix);
      this.blobs.instanceMatrix.needsUpdate = true;
    }
    const blink = time % HOME.BLINK_PERIOD_S < HOME.BLINK_S;
    for (const eye of this.eyes[this.selected]!) eye.visible = !blink;
    for (const eye of this.logoEyes) eye.visible = !blink;
    for (const tail of this.tails[this.selected]!) tail.rotation.y = this.reduced ? 0 : Math.sin(time * HOME.TAIL_SPEED) * HOME.TAIL_WAG;
    for (let i = 0; i < this.gloves[this.selected]!.length; i++) this.gloves[this.selected]![i]!.rotation.x = this.reduced ? 0 : Math.sin(time * HOME.GLOVE_SPEED + i * Math.PI) * HOME.GLOVE_SWING * (hop > 0 ? 2 : 1);
    this.logo.position.copy(this.logoBase).addScaledVector(this.up, this.reduced ? 0 : Math.sin(time) * HOME.LOGO_BOB);
  }
}
