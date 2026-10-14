import { LOADING } from '../../../shared/config';
import { downloads } from './downloads';
import { readPreferences } from './settings';

/** Inline markup paints before this module arrives; add byte progress and the exit. */
export class Loading {
  private readonly layer = document.querySelector<HTMLElement>('#loading')!;
  private readonly scene = this.layer.querySelector<HTMLElement>('.load-scene')!;
  private readonly meter = this.layer.querySelector<HTMLElement>('[role=progressbar]')!;
  private readonly fill = this.layer.querySelector<HTMLElement>('.load-fill')!;
  private readonly percent = this.layer.querySelector<HTMLElement>('.load-percent')!;
  private readonly tip = this.layer.querySelector<HTMLElement>('.load-tip')!;
  private readonly reduced = readPreferences({ getItem: key => localStorage.getItem(key) }, matchMedia('(prefers-reduced-motion:reduce)').matches).reducedMotion;
  private target = 0;
  private shown = 0;
  private previous = performance.now();
  private frame = 0;
  private stopped = false;
  constructor() {
    document.documentElement.classList.toggle('loading-reduced', this.reduced);
    downloads.onProgress = (loaded, total) => {
      this.target = Math.max(this.target, total ? Math.min(99, loaded / total * 100) : 0);
      this.layer.dataset.bytes = String(loaded); this.layer.dataset.total = String(total);
    };
    this.frame = requestAnimationFrame(this.tick);
  }
  private readonly tick = (now: number): void => {
    const dt = now - this.previous; this.previous = now;
    this.shown += (this.target - this.shown) * (1 - Math.exp(-dt / LOADING.EASE_MS));
    this.fill.style.transform = `scaleX(${this.shown / 100})`;
    const value = Math.floor(this.shown);
    this.meter.setAttribute('aria-valuenow', String(value)); this.percent.textContent = `Loading… ${value}%`;
    this.tip.textContent = LOADING.TIPS[Math.floor(now / LOADING.TIP_MS) % LOADING.TIPS.length]!;
    if (!this.stopped) this.frame = requestAnimationFrame(this.tick);
  };
  error(retry: () => Promise<void>, message?: string): void {
    this.layer.dataset.state = 'error';
    const error = this.layer.querySelector<HTMLElement>('#load-error')!;
    error.hidden = false;
    if (message) error.querySelector('p')!.textContent = message;
    const button = this.layer.querySelector<HTMLButtonElement>('#load-retry')!;
    button.onclick = () => {
      button.disabled = true; error.hidden = true; this.layer.dataset.state = 'loading';
      void retry().finally(() => { button.disabled = false; });
    };
  }
  async finish(): Promise<void> {
    this.stopped = true; cancelAnimationFrame(this.frame); downloads.onProgress = null;
    this.fill.style.transform = 'scaleX(1)'; this.meter.setAttribute('aria-valuenow', '100'); this.percent.textContent = 'Loading… 100%';
    const fast = performance.now() < LOADING.FAST_MS;
    this.layer.dataset.fast = String(fast); this.layer.dataset.state = 'ready';
    if (this.reduced) {
      this.layer.dataset.state = 'fade';
      await this.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOADING.FADE_MS, fill: 'forwards' }).finished;
    } else {
      if (!fast) {
        this.layer.dataset.state = 'punch';
        const gloves = this.layer.querySelector<SVGElement>('.load-gloves')!;
        await gloves.animate([{ transform: 'scale(1)' }, { transform: 'scale(2.7) translateY(8px)' }],
          { duration: LOADING.PUNCH_MS, easing: 'cubic-bezier(.5,0,1,.4)', fill: 'forwards' }).finished;
        gloves.style.transform = 'scale(2.7) translateY(8px)';
      }
      const right = this.scene.cloneNode(true) as HTMLElement;
      right.setAttribute('aria-hidden', 'true'); right.inert = true;
      right.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      this.layer.append(right);
      this.scene.style.clipPath = 'polygon(0 0,100% 0,0 100%)';
      right.style.clipPath = 'polygon(100% 0,100% 100%,0 100%)';
      this.layer.dataset.state = 'reveal';
      const options: KeyframeAnimationOptions = { duration: LOADING.REVEAL_MS, easing: 'cubic-bezier(.895,.03,.685,.22)', fill: 'forwards' };
      await Promise.all([
        this.scene.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-100%,-100%)' }], options).finished,
        right.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(100%,100%)' }], options).finished,
      ]);
    }
    this.layer.hidden = true; this.layer.dataset.state = 'complete';
    performance.mark('hop-brawl-interactive');
  }
}
