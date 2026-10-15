import { CONFIG } from '../../../shared/config';
import type { HopDirection } from '../../../shared/movement';

export function swipeDirection(dx: number, dy: number): HopDirection | null {
  if (dx * dx + dy * dy < CONFIG.SWIPE_THRESHOLD_PX * CONFIG.SWIPE_THRESHOLD_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
}
const KEYS: Readonly<Record<string, HopDirection>> = {
  ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
};

/** Canvas-only Pointer Events prevent UI clicks from becoming hops. One gesture, one move. */
export class HopInput {
  enabled = false;
  private pointer = -1;
  private x = 0; private y = 0; private downAt = 0; private consumed = false;
  constructor(private readonly canvas: HTMLCanvasElement, private readonly hop: (direction: HopDirection) => void) {
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', event => { if (event.pointerId === this.pointer) this.clear(); });
    canvas.addEventListener('contextmenu', event => { if (this.enabled) event.preventDefault(); });
    window.addEventListener('keydown', this.key, true);
    window.addEventListener('keyup', this.keyup, true);
    window.addEventListener('blur', this.clear);
  }
  readonly clear = (): void => { this.pointer = -1; this.consumed = false; };
  private readonly down = (event: PointerEvent): void => {
    if (!this.enabled || this.pointer !== -1 || event.button !== 0) return;
    event.preventDefault(); this.canvas.setPointerCapture(event.pointerId);
    this.pointer = event.pointerId; this.x = event.clientX; this.y = event.clientY; this.downAt = event.timeStamp; this.consumed = false;
  };
  private readonly move = (event: PointerEvent): void => {
    if (!this.enabled || event.pointerId !== this.pointer || this.consumed) return;
    const direction = swipeDirection(event.clientX - this.x, event.clientY - this.y);
    if (direction) { this.consumed = true; this.hop(direction); }
  };
  private readonly up = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointer) return;
    if (this.enabled && !this.consumed) {
      const direction = swipeDirection(event.clientX - this.x, event.clientY - this.y);
      if (direction || event.timeStamp - this.downAt <= CONFIG.TAP_MAX_MS) this.hop(direction ?? 'up');
    }
    this.clear();
  };
  private readonly keyup = (event: KeyboardEvent): void => {
    if (this.enabled && (KEYS[event.key] || event.key === 'Enter')) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  private readonly key = (event: KeyboardEvent): void => {
    if (!this.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
    const direction = KEYS[event.key];
    if (direction || event.key === 'Enter') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.target instanceof HTMLElement) event.target.blur();
      if (direction && !event.repeat) this.hop(direction);
    }
  };
}
