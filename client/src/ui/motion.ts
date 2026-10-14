import { gsap } from 'gsap';
import { CONFIG, VIEW } from '../../../shared/config';
import { Pool } from '../game/pool';

/** Panels remain mounted. New navigation cancels stale completion callbacks. */
export class Motion {
  reduced = false;
  private current: HTMLElement | null = null;
  private transition: gsap.core.Timeline | null = null;
  private flip: gsap.core.Timeline | null = null;
  private readonly tiles: HTMLElement[] = [];
  private readonly items = new Map<HTMLElement, HTMLElement[]>();
  private readonly toasts: Pool<{ element: HTMLElement; timeline: gsap.core.Timeline | null }>;

  constructor(private readonly panels: readonly HTMLElement[], private readonly cover: HTMLElement, toastRoot: HTMLElement) {
    for (const panel of panels) this.items.set(panel, Array.from(panel.querySelectorAll<HTMLElement>('.mode-buttons > button, .panel > label, .panel > button')));
    for (let i = 0; i < VIEW.TILE_FLIP_COLUMNS * VIEW.TILE_FLIP_ROWS; i++) {
      const tile = document.createElement('i');
      cover.append(tile); this.tiles.push(tile);
    }
    this.toasts = new Pool(VIEW.TOAST_POOL, () => {
      const element = document.createElement('div'); element.className = 'toast'; element.hidden = true;
      toastRoot.append(element); return { element, timeline: null };
    });
    document.addEventListener('pointerdown', event => this.press(event, true));
    document.addEventListener('pointerup', event => this.press(event, false));
    document.addEventListener('pointercancel', event => this.press(event, false));
    document.addEventListener('pointerout', event => this.press(event, false));
  }

  show(next: HTMLElement): void {
    if (next === this.current) return;
    this.transition?.kill();
    const previous = this.current;
    this.current = next;
    for (const panel of this.panels) {
      gsap.killTweensOf(panel);
      gsap.killTweensOf(this.items.get(panel)!);
      panel.inert = panel !== next;
      if (panel !== next && panel !== previous) { panel.hidden = true; gsap.set(panel, { opacity: 0 }); }
    }
    const fresh = next.hidden;
    next.hidden = false;
    const enterItems = this.items.get(next)!;
    if (fresh) {
      gsap.set(next, { opacity: 0, y: this.reduced ? 0 : VIEW.PANEL_ENTER_PX });
      gsap.set(enterItems, { opacity: 0, y: this.reduced ? 0 : VIEW.PANEL_ENTER_PX });
    }
    gsap.ticker.tick();
    const timeline = gsap.timeline({ onComplete: () => {
      for (const panel of this.panels) if (panel !== this.current) { panel.hidden = true; gsap.set(panel, { opacity: 0 }); }
    } });
    this.transition = timeline;
    if (previous) timeline.to(previous, { opacity: 0, y: this.reduced ? 0 : -VIEW.PANEL_EXIT_PX,
      duration: VIEW.PANEL_EXIT_MS / 1000, ease: 'power2.in', overwrite: 'auto', onComplete: () => { previous.hidden = true; } }, 0);
    timeline.to(next, { opacity: 1, y: 0, duration: VIEW.PANEL_ENTER_MS / 1000,
      ease: this.reduced ? 'none' : `back.out(${VIEW.PANEL_OVERSHOOT})`, overwrite: 'auto' }, previous ? VIEW.PANEL_EXIT_MS * VIEW.PANEL_OVERLAP / 1000 : 0);
    timeline.to(enterItems, { opacity: 1, y: 0, duration: VIEW.PANEL_ENTER_MS / 1000,
      stagger: this.reduced ? 0 : VIEW.STAGGER_MS / 1000,
      ease: this.reduced ? 'none' : `back.out(${VIEW.PANEL_OVERSHOOT})`, overwrite: 'auto' }, previous ? VIEW.PANEL_EXIT_MS * VIEW.PANEL_OVERLAP / 1000 : 0);
  }

  settle(): void {
    this.transition?.progress(1); this.flip?.progress(1);
    for (const panel of this.panels) {
      gsap.killTweensOf(panel); panel.hidden = panel !== this.current;
      gsap.set(panel, { opacity: panel === this.current ? 1 : 0, y: 0 });
    }
  }

  private press(event: Event, down: boolean): void {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;
    gsap.to(button, { y: down ? VIEW.BUTTON_PRESS_PX : 0,
      duration: (down ? VIEW.BUTTON_PRESS_MS : VIEW.BUTTON_RELEASE_MS) / 1000,
      ease: down ? 'power1.out' : `back.out(${VIEW.PANEL_OVERSHOOT})`, overwrite: 'auto' });
  }

  tileFlip(swap: () => void): void {
    this.flip?.kill();
    gsap.killTweensOf(this.tiles);
    this.cover.hidden = false;
    const duration = CONFIG.TILE_FLIP_MS / 1000;
    const timeline = gsap.timeline({ onComplete: () => { this.cover.hidden = true; } });
    this.flip = timeline;
    if (this.reduced) {
      gsap.set(this.tiles, { rotationY: 0, opacity: 1 });
      gsap.set(this.cover, { opacity: 0 });
      timeline.to(this.cover, { opacity: 1, duration }).call(swap).to(this.cover, { opacity: 0, duration });
    } else {
      gsap.set(this.cover, { opacity: 1 });
      gsap.set(this.tiles, { rotationY: -90, opacity: 1 });
      timeline.to(this.tiles, { rotationY: 0, duration: duration / 2, ease: 'power3.inOut',
        stagger: { grid: [VIEW.TILE_FLIP_ROWS, VIEW.TILE_FLIP_COLUMNS], from: 'start', amount: duration / 2 } })
        .call(swap).to(this.tiles, { rotationY: 90, duration: duration / 2, ease: 'power3.inOut',
          stagger: { grid: [VIEW.TILE_FLIP_ROWS, VIEW.TILE_FLIP_COLUMNS], from: 'start', amount: duration / 2 } });
    }
  }

  toast(text: string): void {
    let index = this.toasts.acquire();
    if (index < 0) { index = 0; this.toasts.items[index]!.timeline?.kill(); }
    const slot = this.toasts.items[index]!;
    slot.element.textContent = text; slot.element.hidden = false;
    gsap.set(slot.element, { opacity: 0, y: this.reduced ? 0 : -VIEW.PANEL_EXIT_PX });
    slot.timeline = gsap.timeline({ onComplete: () => { slot.element.hidden = true; this.toasts.release(index); } })
      .to(slot.element, { opacity: 1, y: 0, duration: VIEW.TOAST_IN_MS / 1000, ease: `back.out(${VIEW.PANEL_OVERSHOOT})` })
      .to(slot.element, { opacity: 0, y: this.reduced ? 0 : -VIEW.PANEL_EXIT_PX, duration: VIEW.TOAST_OUT_MS / 1000, ease: 'power2.in' }, `+=${VIEW.TOAST_HOLD_MS / 1000}`);
  }
}
