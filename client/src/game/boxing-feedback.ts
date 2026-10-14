import { Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';
import { BOXER, COLORS } from '../../../shared/config';
import type { BoxerCue, BoxerMove } from './boxer';

/** Original synthesized one-shots: no download or API key, obey the SFX setting. */
export class BoxingSound {
  private context: AudioContext | null = null;
  volume = 0.8;
  unlock(): void {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }
  play(cue: BoxerCue): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume === 0 || cue === 'win') return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = cue === 'whoosh' ? 'triangle' : 'sine';
    const hz = cue === 'whoosh' ? BOXER.WHOOSH_HZ : cue === 'hit' ? BOXER.HIT_HZ : BOXER.TOCK_HZ;
    oscillator.frequency.setValueAtTime(hz, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(hz / 4, context.currentTime + BOXER.SFX_S);
    gain.gain.setValueAtTime(this.volume * BOXER.SFX_GAIN, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + BOXER.SFX_S);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + BOXER.SFX_S);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}

/** Three preallocated stars: contact spark, punch impact and orbiting stun stars. */
export class BoxingEffects {
  readonly root = new Group();
  private readonly stars: Mesh[] = [];
  private until = -1;
  constructor() {
    const shape = new Shape();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5, radius = i % 2 ? 0.45 : 1;
      const x = Math.sin(angle) * radius, y = Math.cos(angle) * radius;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    const geometry = new ShapeGeometry(shape);
    const material = new MeshBasicMaterial({ color: COLORS.yellow, toneMapped: false, fog: false });
    for (let i = 0; i < 3; i++) { const star = new Mesh(geometry, material); star.userData.effect = true; star.scale.setScalar(BOXER.STAR_SIZE); this.stars.push(star); this.root.add(star); }
  }
  contact(time: number): void { this.until = time + BOXER.STAR_LIFE; }
  update(time: number, move: BoxerMove, reduced: boolean): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]!;
      star.visible = !reduced && (move === 'stunned' || i === 0 && time < this.until);
      const angle = time * 8 + i * Math.PI * 2 / 3;
      star.position.set(move === 'stunned' ? Math.cos(angle) * BOXER.STAR_RADIUS : 0,
        move === 'stunned' ? BOXER.STAR_Y : 0.45, move === 'stunned' ? Math.sin(angle) * BOXER.STAR_RADIUS : -0.6);
      star.rotation.z = angle;
    }
  }
}
