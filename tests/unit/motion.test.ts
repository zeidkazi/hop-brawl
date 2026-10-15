import { afterEach, expect, it, vi } from 'vitest';
vi.mock('gsap', () => ({ gsap: { set: vi.fn(), killTweensOf: vi.fn(), ticker: { tick: vi.fn() }, timeline: () => ({ to() { return this; }, kill: vi.fn() }) } }));
import { gsap } from 'gsap';
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

it('paints the Friends panel and its buttons immediately instead of waiting for Home exit', () => {
  vi.stubGlobal('document', { createElement: () => ({}), addEventListener: vi.fn() });
  const buttons = [{}], panel = { id: 'friends', hidden: true, inert: true, querySelectorAll: () => buttons } as unknown as HTMLElement;
  const root = { append: vi.fn() } as unknown as HTMLElement;
  const motion = new Motion([panel], root, root); motion.show(panel);
  expect(panel.hidden).toBe(false); expect(panel.inert).toBe(false);
  expect(gsap.set).toHaveBeenCalledWith(panel, { opacity: 1, y: 0 });
  expect(gsap.set).toHaveBeenCalledWith(buttons, { opacity: 1, y: 0 });
});
