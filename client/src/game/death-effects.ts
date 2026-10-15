import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { COLORS, SOLO } from '../../../shared/config';
import type { DeathCause } from '../../../shared/movement';
/** One bounded set per fighter so simultaneous KOs retain independent marks and ripples. */
export class DeathEffects {
  readonly root = new Group();
  private readonly cube = new BoxGeometry(1, 1, 1);
  private readonly ink = new MeshBasicMaterial({ color: COLORS.ink });
  private readonly foam = new MeshBasicMaterial({ color: COLORS.cream, transparent: true });
  private readonly tires = [new Mesh(this.cube, this.ink), new Mesh(this.cube, this.ink)];
  private readonly ripple = Array.from({ length: SOLO.SPLASH_PARTS }, () => new Mesh(this.cube, this.foam));
  constructor() { this.root.add(...this.tires, ...this.ripple); this.root.visible = false; }
  update(cause: DeathCause | null, elapsed: number, x: number, z: number): void {
    const t = Math.max(0, Math.min(1, elapsed * 1000 / SOLO.DEATH_MS));
    this.root.visible = cause !== null && t < 1; this.root.position.set(x, 0, -z);
    for (let i = 0; i < this.tires.length; i++) {
      const mesh = this.tires[i]!; mesh.visible = cause === 'FLATTENED!';
      mesh.position.set((i - .5) * SOLO.TIRE_GAP, SOLO.FLATTEN_Y + SOLO.DECAL_HEIGHT, 0);
      mesh.scale.set(SOLO.TIRE_WIDTH, SOLO.DECAL_HEIGHT, SOLO.TIRE_LENGTH);
    }
    const radius = SOLO.RIPPLE_START + t * SOLO.RIPPLE_GROW; this.foam.opacity = 1 - t;
    for (let i = 0; i < this.ripple.length; i++) {
      const mesh = this.ripple[i]!, angle = i / this.ripple.length * Math.PI * 2;
      mesh.visible = cause === 'SPLASH!'; mesh.position.set(Math.cos(angle) * radius, SOLO.DECAL_HEIGHT, Math.sin(angle) * radius);
      mesh.scale.set(SOLO.RIPPLE_WIDTH, SOLO.DECAL_HEIGHT, SOLO.RIPPLE_WIDTH);
    }
  }
  dispose(): void { this.root.removeFromParent(); this.cube.dispose(); this.ink.dispose(); this.foam.dispose(); }
}
