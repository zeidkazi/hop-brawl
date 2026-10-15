import { Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector3 } from 'three';
import { BOXER, COLORS, RAIL, SOUND } from '../../../shared/config';
import type { BoxerCue, BoxerMove } from './boxer';

/** Original synthesized one-shots: no download or API key, obey the SFX setting. */
export class BoxingSound {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  volume = 0.8;
  unlock(): void {
    this.context ??= new AudioContext();
    if (!this.noise) {
      this.noise = this.context.createBuffer(1, this.context.sampleRate * SOUND.NOISE_S, this.context.sampleRate);
      const samples = this.noise.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }
  play(cue: BoxerCue | 'bell' | keyof typeof SOUND.cues, pan = 0, level = 1): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume === 0) return;
    if (cue === 'win') { SOUND.WIN_NOTES.forEach((hz, i) => this.tone(hz, hz, SOUND.WIN_NOTE_S, 'triangle', false, pan, level, i * SOUND.WIN_STEP_S)); return; }
    if (cue in SOUND.cues) {
      const p = SOUND.cues[cue as keyof typeof SOUND.cues]; this.tone(p.hz, p.end, p.seconds, p.wave, p.noise, pan, level); return;
    }
    const hz = cue === 'bell' ? RAIL.BELL_HZ : cue === 'whoosh' ? BOXER.WHOOSH_HZ : cue === 'hit' ? BOXER.HIT_HZ : BOXER.TOCK_HZ;
    this.tone(hz, cue === 'bell' ? hz : hz / 4, cue === 'bell' ? RAIL.BELL_S : BOXER.SFX_S,
      cue === 'whoosh' ? 'triangle' : 'sine', false, pan, level);
  }
  private tone(hz: number, end: number, duration: number, wave: OscillatorType, noise: boolean, pan: number, level: number, delay = 0): void {
    const context = this.context!;
    if (this.voices.size >= SOUND.MAX_VOICES) { const oldest = this.voices.values().next().value!; oldest.stop(); this.voices.delete(oldest); }
    const gain = context.createGain(), panner = context.createStereoPanner(), filter = context.createBiquadFilter();
    const start = context.currentTime + delay;
    const source = noise ? context.createBufferSource() : context.createOscillator();
    if (source instanceof AudioBufferSourceNode) { source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(hz, start); filter.frequency.exponentialRampToValueAtTime(end, start + duration); }
    else { source.type = wave; source.frequency.setValueAtTime(hz, start); source.frequency.exponentialRampToValueAtTime(end, start + duration); filter.type = 'allpass'; }
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(SOUND.FLOOR, start);
    gain.gain.linearRampToValueAtTime(this.volume * SOUND.GAIN * level, start + SOUND.ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SOUND.FLOOR, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(context.destination);
    this.voices.add(source); source.start(start); source.stop(start + duration);
    source.onended = () => { this.voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
  }
}

/** Three preallocated stars: contact spark, punch impact and orbiting stun stars. */
export class BoxingEffects {
  readonly root = new Group();
  private readonly stars: Mesh[] = [];
  private until = -1;
  private readonly contactPoint = new Vector3();
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
    for (let i = 0; i < 3; i++) { const star = new Mesh(geometry, material); star.userData.effect = true; star.frustumCulled = false; star.scale.setScalar(BOXER.STAR_SIZE); this.stars.push(star); this.root.add(star); }
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
