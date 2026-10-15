import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { COLORS, SOLO } from '../../../shared/config';
import type { DeathCause } from '../../../shared/movement';
/** Bounded, preallocated effects per fighter; readable at phone gameplay scale. */
export class DeathEffects {
  readonly root = new Group();
  private readonly cube = new BoxGeometry(1, 1, 1);
  private readonly ring = new RingGeometry(1 - SOLO.RIPPLE_WIDTH, 1, SOLO.RIPPLE_SEGMENTS);
  private readonly ink = new MeshBasicMaterial({ color: COLORS.ink, transparent: true });
  private readonly foam = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, toneMapped: false, side: DoubleSide, depthWrite: false });
  private readonly blue = new MeshBasicMaterial({ color: '#BDEEFF', toneMapped: false });
  private readonly tires = [new Mesh(this.cube, this.ink), new Mesh(this.cube, this.ink)];
  private readonly ripple = new Mesh(this.ring, this.foam);
  private readonly spray = Array.from({ length: SOLO.SPLASH_PARTS }, (_, i) => new Mesh(this.cube, i % 2 ? this.blue : this.foam));
  private readonly bubbles = [new Mesh(this.cube, this.blue), new Mesh(this.cube, this.blue)];
  constructor() {
    this.ripple.rotation.x = -Math.PI / 2; this.ripple.name = 'ripple';
    this.spray.forEach((m, i) => m.name = `droplet-${i}`); this.bubbles.forEach((m, i) => m.name = `bubble-${i}`);
    this.root.add(...this.tires, this.ripple, ...this.spray, ...this.bubbles); this.root.visible = false;
  }
  update(cause: DeathCause | null, elapsed: number, x: number, z: number): void {
    const splash = cause === 'SPLASH!', flat = cause === 'FLATTENED!';
    this.root.visible = (flat && elapsed < SOLO.PANCAKE_HOLD_S + SOLO.PANCAKE_FADE_S) || (splash && elapsed < SOLO.DEATH_MS / 1000);
    this.root.position.set(x, 0, -z);
    this.ink.opacity = Math.max(0, Math.min(1, 1 - (elapsed - SOLO.PANCAKE_HOLD_S) / SOLO.PANCAKE_FADE_S));
    for (let i = 0; i < this.tires.length; i++) {
      const mesh = this.tires[i]!; mesh.visible = flat;
      mesh.position.set((i - .5) * SOLO.TIRE_GAP, SOLO.FLATTEN_Y + SOLO.DECAL_HEIGHT, 0);
      mesh.scale.set(SOLO.TIRE_WIDTH, SOLO.DECAL_HEIGHT, SOLO.TIRE_LENGTH);
    }
    const t = Math.max(0, elapsed / SOLO.RIPPLE_S), radius = SOLO.RIPPLE_START + Math.min(1, t) * SOLO.RIPPLE_GROW;
    this.foam.opacity = Math.max(0, 1 - t * t);
    this.ripple.visible = splash && t < 1; this.ripple.position.y = SOLO.DECAL_HEIGHT; this.ripple.scale.setScalar(radius);
    const flight = elapsed / SOLO.SPRAY_S;
    for (let i = 0; i < this.spray.length; i++) {
      const mesh = this.spray[i]!, angle = i / this.spray.length * Math.PI * 2;
      mesh.visible = splash && flight >= 0 && flight < 1;
      const spread = SOLO.RIPPLE_START + flight * SOLO.SPRAY_RADIUS, height = SOLO.SPRAY_HEIGHT * (1 - (i % 3) * .1);
      mesh.position.set(Math.cos(angle) * spread, SOLO.DECAL_HEIGHT + 4 * height * flight * (1 - flight), Math.sin(angle) * spread);
      mesh.scale.setScalar(SOLO.SPRAY_SIZE); mesh.rotation.set(flight * Math.PI, angle, flight * Math.PI);
    }
    for (let i = 0; i < this.bubbles.length; i++) {
      const mesh = this.bubbles[i]!, age = (elapsed - SOLO.BUBBLE_START_S - i * SOLO.BUBBLE_DELAY_S) / SOLO.BUBBLE_S;
      mesh.visible = splash && age >= 0 && age < 1;
      mesh.position.set((i - .5) * SOLO.RIPPLE_START, SOLO.DECAL_HEIGHT + Math.max(0, age) * SOLO.BUBBLE_SIZE, 0);
      mesh.scale.setScalar(SOLO.BUBBLE_SIZE * (1 + Math.max(0, age)));
    }
  }
  dispose(): void { this.root.removeFromParent(); this.cube.dispose(); this.ring.dispose(); this.ink.dispose(); this.foam.dispose(); this.blue.dispose(); }
}
