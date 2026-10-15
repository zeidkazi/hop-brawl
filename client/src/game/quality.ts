import { QUALITY, QUALITY_DEGRADE, VIEW } from '../../../shared/config';

export type Tier = keyof typeof QUALITY;
export type GraphicsChoice = 'auto' | 'high' | 'low';

/** Fixed storage and an in-place scratch sort; no per-frame sample allocations. */
export class FrameWindow {
  private readonly times = new Float64Array(VIEW.FRAME_SAMPLES);
  private readonly durations = new Float64Array(VIEW.FRAME_SAMPLES);
  private readonly scratch = new Float64Array(VIEW.FRAME_SAMPLES);
  private cursor = 0;
  private count = 0;
  p90 = 0;
  p95 = 0;
  worst = 0;

  add(now: number, duration: number): void {
    this.times[this.cursor] = now;
    this.durations[this.cursor] = duration;
    this.cursor = (this.cursor + 1) % VIEW.FRAME_SAMPLES;
    this.count = Math.min(VIEW.FRAME_SAMPLES, this.count + 1);
  }

  measure(now: number): void {
    this.scratch.fill(Infinity);
    let n = 0;
    for (let i = 0; i < this.count; i++) {
      if (now - this.times[i]! <= VIEW.FRAME_WINDOW_MS) this.scratch[n++] = this.durations[i]!;
    }
    this.scratch.sort();
    this.p90 = n ? this.scratch[Math.ceil(n * 0.9) - 1]! : 0;
    this.p95 = n ? this.scratch[Math.ceil(n * 0.95) - 1]! : 0;
    this.worst = n ? this.scratch[n - 1]! : 0;
  }

  reset(): void { this.count = 0; this.cursor = 0; this.p90 = this.p95 = this.worst = 0; }
}

export class QualityController {
  readonly frames = new FrameWindow();
  tier: Tier;
  choice: GraphicsChoice = 'auto';
  resolution = 1;
  degradation = 0;
  private nextCheck = 0;
  private slowSince = -1;
  private fastSince = -1;

  constructor(readonly mobile: boolean) { this.tier = mobile ? 'medium' : 'high'; }

  setChoice(choice: GraphicsChoice): void {
    this.choice = choice;
    this.tier = choice === 'auto' ? (this.mobile ? 'medium' : 'high') : choice;
    this.resolution = 1; this.degradation = choice === 'low' ? QUALITY_DEGRADE.BLOB_SHADOWS : 0;
    this.reset();
  }

  reset(): void { this.frames.reset(); this.slowSince = this.fastSince = -1; this.nextCheck = 0; }

  get particleScale(): number { return this.degradation >= QUALITY_DEGRADE.PARTICLES ? QUALITY_DEGRADE.PARTICLE_SCALE : 1; }
  get weatherCount(): number { return this.degradation >= QUALITY_DEGRADE.WEATHER ? 0 : QUALITY[this.tier].weather; }
  get propOutlines(): boolean { return this.degradation < QUALITY_DEGRADE.PROP_OUTLINES; }
  get shadowSize(): number {
    return this.tier === 'low' || this.degradation >= QUALITY_DEGRADE.BLOB_SHADOWS ? 0
      : this.degradation >= QUALITY_DEGRADE.SHADOW_SIZE ? QUALITY_DEGRADE.SHADOW_SIZE_REDUCED : QUALITY[this.tier].shadowSize;
  }
  sample(now: number, deltaMs: number, playing: boolean): boolean {
    const beforeResolution = this.resolution, beforeStage = this.degradation;
    if (!playing) this.resolution = 1;
    this.frames.add(now, deltaMs);
    if (now < this.nextCheck) return beforeResolution !== this.resolution;
    this.nextCheck = now + VIEW.QUALITY_CHECK_MS; this.frames.measure(now);
    if (this.choice !== 'auto') return beforeResolution !== this.resolution;
    if (this.frames.p90 > VIEW.DOWNGRADE_P90_MS) {
      this.fastSince = -1;
      if (this.slowSince < 0) this.slowSince = now;
      if (now - this.slowSince >= VIEW.DOWNGRADE_HOLD_MS) {
        if (this.degradation < QUALITY_DEGRADE.BLOB_SHADOWS) this.degradation++;
        else if (playing) this.resolution = Math.max(VIEW.RESOLUTION_MIN, this.resolution - VIEW.RESOLUTION_STEP);
        this.slowSince = now;
      }
    } else {
      this.slowSince = -1;
      if (!playing && this.frames.p90 > 0 && this.frames.p90 < VIEW.UPGRADE_P90_MS) {
        if (this.fastSince < 0) this.fastSince = now;
        if (now - this.fastSince >= VIEW.DOWNGRADE_HOLD_MS) {
          this.degradation = Math.max(0, this.degradation - 1); this.fastSince = now;
        }
      } else this.fastSince = -1;
    }
    this.tier = this.degradation >= QUALITY_DEGRADE.BLOB_SHADOWS ? 'low' : this.mobile ? 'medium' : 'high';
    return beforeStage !== this.degradation || beforeResolution !== this.resolution;
  }

  pixelRatio(deviceRatio: number, playing = true): number {
    // Auto's blob fallback does not silently lower resolution with the material tier.
    const cap = QUALITY[this.choice === 'low' ? 'low' : this.mobile ? 'medium' : 'high'].pixelRatio;
    return Math.max(Math.min(deviceRatio, 1), Math.min(deviceRatio, cap) * (playing ? this.resolution : 1));
  }
}
