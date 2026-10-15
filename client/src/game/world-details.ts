import { Box3, CircleGeometry, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, Sphere, Vector3 } from 'three';
import { COLORS, DETAIL, VIEW, WORLD } from '../../../shared/config';
import { grassDecor, GRASS_PROPS } from '../../../shared/world-detail';
import { hash32 } from '../../../shared/rng';
import type { Row } from '../../../shared/types';
import type { Tier } from './quality';
import { Outlines } from './outlines';
import { normalizedModel } from './model-geometry';

const VEHICLES = [...DETAIL.CAR_STYLES, ...DETAIL.TRUCK_STYLES] as readonly string[];
/** One instance batch per authored shape. Static decoration is rebuilt only on row recycling. */
export class WorldDetails {
  readonly root = new Group(); readonly outlines = new Outlines();
  readonly batches = new Map<string, InstancedMesh>();
  private readonly sizes = new Map<string, Vector3>();
  private readonly standard = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  private readonly lambert = new MeshLambertMaterial({ vertexColors: true });
  private readonly transform = new Object3D(); private readonly white = new Color('#FFFFFF');
  private readonly paints = DETAIL.PAINTS.map(c => new Color(c));
  private readonly seen: (Row | null)[] = Array(VIEW.POOL_ROWS).fill(null);
  private readonly flutter: { x: number; z: number }[] = []; private readonly ducks: number[] = [];
  private seed = NaN; private bottom = 0;
  readonly clouds: InstancedMesh;
  constructor(models: ReadonlyMap<string, Group>) {
    const assets = new Map<string, Group>();
    const detail = models.get('detail_props')!;
    for (const child of detail.children) if (child instanceof Mesh && child.userData.detail_kind) {
      const group = new Group(); group.add(child.clone()); assets.set(child.userData.detail_kind as string, group);
    }
    for (const name of VEHICLES) if (!assets.has(name)) assets.set(name, models.get(name)!);
    for (const [name, group] of assets) {
      const size = new Box3().setFromObject(group).getSize(new Vector3()); this.sizes.set(name, size);
      const mesh = new InstancedMesh(normalizedModel(group), this.standard, VIEW.POOL_ROWS * DETAIL.PROP_MAX);
      mesh.name = `detail-${name}`; mesh.count = 0; mesh.matrixAutoUpdate = false;
      mesh.boundingSphere = new Sphere(new Vector3(4,0,0), VIEW.POOL_ROWS);
      mesh.receiveShadow = true; mesh.castShadow = VEHICLES.includes(name);
      for (let i=0;i<mesh.instanceMatrix.count;i++) mesh.setColorAt(i,this.white);
      this.root.add(mesh); this.batches.set(name,mesh); this.outlines.add(mesh, VEHICLES.includes(name) ? 'vehicle' : 'prop');
    }
    const circle = new CircleGeometry(1, VIEW.BLOB_SEGMENTS); circle.rotateX(-Math.PI/2);
    const material = new MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: DETAIL.CLOUD_OPACITY, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 cloudUv;\n'+shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ncloudUv = uv;');
      shader.fragmentShader = 'varying vec2 cloudUv;\n'+shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= 1.0-smoothstep(0.05,0.5,length(cloudUv-0.5));');
    };
    this.clouds = new InstancedMesh(circle,material,DETAIL.CLOUD_COUNT); this.clouds.frustumCulled=false; this.clouds.matrixAutoUpdate=false; this.root.add(this.clouds);
    this.applyTier('high');
  }
  applyTier(tier: Tier): void {
    for (const [name, mesh] of this.batches) { mesh.material=tier==='high'?this.standard:this.lambert; mesh.castShadow=tier!=='low'&&VEHICLES.includes(name); }
    this.outlines.applyTier(tier);
  }
  private put(name: string,x: number,y: number,z: number,sx: number,sy: number,sz: number,angle=0,paint=-1): void {
    const mesh=this.batches.get(name)!;
    this.transform.position.set(x,y+sy/2,-z); this.transform.rotation.set(0,angle,0); this.transform.scale.set(sx,sy,sz); this.transform.updateMatrix();
    mesh.setMatrixAt(mesh.count,this.transform.matrix); mesh.setColorAt(mesh.count++,paint<0?this.white:this.paints[paint%this.paints.length]!);
  }
  private prop(name: string,x: number,z: number,turn=0,y=0): void {
    const size=this.sizes.get(name)!;
    this.put(name,x,y,z,size.x*DETAIL.PROP_SCALE,size.y*DETAIL.PROP_SCALE,Math.min(DETAIL.PROP_DEPTH_MAX,size.z*DETAIL.PROP_SCALE),turn);
  }
  begin(rows: readonly { row: Row | null; z: number }[], seed: number, time: number, reduced: boolean, weather: boolean): void {
    this.bottom=Infinity;
    let changed=seed!==this.seed; this.seed=seed;
    for (let i=0;i<rows.length;i++) { if(this.seen[i]!==rows[i]!.row) changed=true; this.seen[i]=rows[i]!.row; this.bottom=Math.min(this.bottom,rows[i]!.z); }
    for(const name of VEHICLES) this.batches.get(name)!.count=0;
    if(changed) {
      for(const name of GRASS_PROPS) this.batches.get(name)!.count=0;
      this.batches.get('lily_pad')!.count=0; this.flutter.length=this.ducks.length=0;
      for(const slot of rows) {
        const row=slot.row; if(!row)continue;
        if(row.kind==='grass') {
          const props=grassDecor(seed,row);
          for(const p of props) this.prop(p.kind,p.x,row.z,p.turn);
          if(this.flutter.length<DETAIL.BUTTERFLY_COUNT) this.flutter.push({x:props[0]!.x,z:row.z});
        } else if(row.kind==='river') {
          this.prop('lily_pad',DETAIL.OUTSIDE_LEFT,row.z); this.prop('lily_pad',DETAIL.OUTSIDE_RIGHT,row.z);
          if(hash32(seed,row.z)%DETAIL.DUCK_CHANCE===0)this.ducks.push(row.z);
        }
      }
      for(const name of GRASS_PROPS) this.upload(this.batches.get(name)!);
      this.upload(this.batches.get('lily_pad')!);
    }
    for(const mesh of this.batches.values()) mesh.boundingSphere!.center.set(4,1,-this.bottom-VIEW.POOL_ROWS/2);
    const duck=this.batches.get('duck')!; duck.count=0;
    for(const z of this.ducks) this.prop('duck',DETAIL.OUTSIDE_LEFT-Math.sin((reduced?0:time)*DETAIL.DUCK_SPEED+z),z,Math.PI/2);
    this.upload(duck);
    const bird=this.batches.get('bird')!, butterfly=this.batches.get('butterfly')!; bird.count=butterfly.count=0;
    if(weather&&!reduced) {
      for(let i=0;i<DETAIL.BIRD_COUNT;i++) this.prop('bird',WORLD.LOOP_MIN_X+((time*DETAIL.BIRD_SPEED+i*5)%(WORLD.LOOP_MAX_X-WORLD.LOOP_MIN_X)),this.bottom+VIEW.POOL_ROWS/3+i*2,Math.PI/2,DETAIL.BIRD_HEIGHT);
      for(let i=0;i<this.flutter.length;i++) { const p=this.flutter[i]!; this.prop('butterfly',p.x+Math.sin(time+i)*DETAIL.BUTTERFLY_WAVE,p.z,Math.sin(time*DETAIL.BUTTERFLY_HZ+i),DETAIL.BUTTERFLY_HEIGHT+Math.sin(time*DETAIL.BUTTERFLY_HZ)*DETAIL.BUTTERFLY_WAVE); }
    }
    this.upload(bird);this.upload(butterfly); this.clouds.visible=weather&&!reduced;
    if(this.clouds.visible)for(let i=0;i<DETAIL.CLOUD_COUNT;i++) {
      this.transform.position.set(-4+((time*DETAIL.CLOUD_SPEED+i*7)%20),.025,-this.bottom-i*VIEW.POOL_ROWS/DETAIL.CLOUD_COUNT);
      this.transform.rotation.set(0,0,0); this.transform.scale.set(DETAIL.CLOUD_SCALE,1,DETAIL.CLOUD_SCALE*1.4);this.transform.updateMatrix();this.clouds.setMatrixAt(i,this.transform.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate=this.clouds.visible;
  }
  vehicle(name: string,x: number,z: number,length: number,direction: number,index: number): void {
    const size=this.sizes.get(name)!, fast=name==='sports_car'||name==='bus';
    this.put(name,x,0,z,length*(fast?DETAIL.FAST_SIZE:1),size.y,size.z,direction<0?Math.PI:0,
      name==='sports_car'||name==='bus'||name==='taxi'?-1:hash32(this.seed,z+index)%this.paints.length);
  }
  finish(): void { for(const name of VEHICLES)this.upload(this.batches.get(name)!); this.outlines.sync(); }
  private upload(mesh: InstancedMesh): void {
    if(!mesh.count)return;
    mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true;
    mesh.instanceColor!.clearUpdateRanges();mesh.instanceColor!.addUpdateRange(0,mesh.count*3);mesh.instanceColor!.needsUpdate=true;
  }
}
