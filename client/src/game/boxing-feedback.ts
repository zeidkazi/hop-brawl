import { Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector3 } from 'three';
import { BOXER, COLORS } from '../../../shared/config';
import type { BoxerMove } from './boxer';

export { BoxingSound } from './audio';

/** Three preallocated stars: contact spark, punch impact and orbiting stun stars. */
export class BoxingEffects {
  readonly root = new Group();
  private readonly stars: Mesh[] = [];
  private until = -1;
  private readonly contactPoint = new Vector3();
  constructor(size = 1) {
    const shape = new Shape();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5, radius = i % 2 ? 0.45 : 1;
      const x = Math.sin(angle) * radius, y = Math.cos(angle) * radius;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    const geometry = new ShapeGeometry(shape);
    const material = new MeshBasicMaterial({ color: COLORS.yellow, toneMapped: false, fog: false });
    for (let i = 0; i < 3; i++) { const star = new Mesh(geometry, material); star.userData.effect = true; star.frustumCulled = false; star.scale.setScalar(BOXER.STAR_SIZE * size); this.stars.push(star); this.root.add(star); }
  }
  dispose(): void {
    this.root.removeFromParent(); this.stars[0]?.geometry.dispose();
    (this.stars[0]?.material as MeshBasicMaterial | undefined)?.dispose();
  }
  contact(time: number, point: Vector3): void { this.until = time + BOXER.STAR_LIFE; this.contactPoint.copy(point); }
  warmAll(value: boolean): void { for (const star of this.stars) star.visible = value; }
  update(time: number, move: BoxerMove, reduced: boolean): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]!;
      star.visible = !reduced && (move === 'stunned' || i === 0 && time < this.until);
      const angle = time * 8 + i * Math.PI * 2 / 3;
      star.position.set(move === 'stunned' ? Math.cos(angle) * BOXER.STAR_RADIUS : 0,
        move === 'stunned' ? BOXER.STAR_Y : 0.45, move === 'stunned' ? Math.sin(angle) * BOXER.STAR_RADIUS : -0.6);
      if (move !== 'stunned') star.position.copy(this.contactPoint).sub(this.root.position).divide(this.root.scale);
      star.rotation.z = angle;
    }
  }
}
