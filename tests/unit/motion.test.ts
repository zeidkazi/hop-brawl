import { afterEach, expect, it, vi } from 'vitest';
vi.mock('gsap', () => ({ gsap: { set: vi.fn(), timeline: () => ({ to() { return this; }, kill: vi.fn() }) } }));
import { Motion } from '../../client/src/ui/motion';
import { VIEW } from '../../shared/config';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('expires toast slots at 2.5 seconds and clears pending toasts at round changes', () => {
  vi.useFakeTimers(); const nodes: { hidden: boolean; textContent: string }[] = [];
  vi.stubGlobal('document', { createElement: () => ({ hidden: true, textContent: '' }), addEventListener: vi.fn() });
  const motion = new Motion([], { append: vi.fn() } as unknown as HTMLElement,
    { append: (node: any) => nodes.push(node) } as unknown as HTMLElement);
  motion.toast('first'); vi.advanceTimersByTime(VIEW.TOAST_HOLD_MS - 1); expect(nodes[0]!.hidden).toBe(false);
  vi.advanceTimersByTime(1); expect(nodes[0]!.hidden).toBe(true);
  motion.toast('old round'); motion.clearToasts(); expect(nodes.every(n => n.hidden && !n.textContent)).toBe(true);
  motion.toast('new round'); vi.advanceTimersByTime(100); expect(nodes.some(n => !n.hidden)).toBe(true);
  motion.clearToasts(); vi.advanceTimersByTime(3000); expect(nodes.every(n => n.hidden)).toBe(true);
});
