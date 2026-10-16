import { BoxGeometry, Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, Object3D, Sphere, Vector3 } from 'three';
import { COLORS, QUALITY, VIEW } from '../../../shared/config';
import { impactElapsed } from '../../../shared/camera';
import { Pool } from './pool';
import type { Tier } from './quality';

export class Particles {
  readonly mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), VIEW.PARTICLE_POOL);
  readonly pool = new Pool(VIEW.PARTICLE_POOL, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, impact: false, color: 0 }));
  private readonly transform = new Object3D();
  private readonly color = new Color();
  tier: Tier = 'high';
  reducedMotion = false;
  density = 1;

  constructor() {
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.boundingSphere = new Sphere(new Vector3(), VIEW.FAR);
    const color = new Color(COLORS.cream);
    for (let i = 0; i < VIEW.PARTICLE_POOL; i++) this.mesh.setColorAt(i, color);
    this.mesh.count = 0;
  }

  burst(x: number, z: number, tint: string = COLORS.cream, impact = false): void {
    const color = this.color.set(tint).getHex();
    const count = Math.floor(VIEW.PROPS_PER_ROW * QUALITY[this.tier].particles * this.density * (this.reducedMotion ? 0.5 : 1));
    for (let i = 0; i < count; i++) {
      const index = this.pool.acquire();
      if (index < 0) break;
      const particle = this.pool.items[index]!;
      const angle = i / count * Math.PI * 2;
      particle.x = x; particle.y = 0; particle.z = z; particle.age = 0;
      particle.color = color; particle.impact = impact;
      particle.vx = Math.cos(angle) * VIEW.DUST_SPEED;
      particle.vz = Math.sin(angle) * VIEW.DUST_SPEED;
      particle.vy = VIEW.DUST_SPEED;
    }
  }

  update(dt: number): void {
    this.mesh.count = 0;
    for (let i = 0; i < this.pool.items.length; i++) {
      if (!this.pool.active(i)) continue;
      const particle = this.pool.items[i]!;
      const previous = particle.age; particle.age += dt;
      const step = particle.impact ? impactElapsed(particle.age, this.reducedMotion) - impactElapsed(previous, this.reducedMotion) : dt;
      if (particle.age >= VIEW.DUST_LIFE_S) { this.pool.release(i); continue; }
      particle.x += particle.vx * step; particle.z += particle.vz * step;
      particle.vy -= VIEW.DUST_GRAVITY * step; particle.y += particle.vy * step;
      this.transform.position.set(particle.x, particle.y, -particle.z);
      this.transform.scale.setScalar((1 - particle.age / VIEW.DUST_LIFE_S) / VIEW.VOXELS_PER_TILE);
      this.transform.updateMatrix();
      this.mesh.setColorAt(this.mesh.count, this.color.setHex(particle.color));
      this.mesh.setMatrixAt(this.mesh.count++, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }
}
