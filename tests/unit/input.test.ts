import { expect, it, vi } from 'vitest';
import { HopInput, swipeDirection } from '../../client/src/game/input';
it('decides touch direction exactly at 24 pixels using the dominant axis', () => {
  expect(swipeDirection(16, 16)).toBeNull();
  expect(swipeDirection(23, 23)).toBe('down');
  expect(swipeDirection(24, 3)).toBe('right');
  expect(swipeDirection(-24, 3)).toBe('left');
  expect(swipeDirection(2, -24)).toBe('up');
  expect(swipeDirection(2, 24)).toBe('down');
});

it('captures gameplay keys before focused buttons, suppresses repeats and space keyup activation', () => {
  class Element { isContentEditable = false; blur = vi.fn(); }
  class Input extends Element {} class Select extends Element {}
  const listeners = new Map<string, (event: any) => void>();
  const add = vi.fn((name: string, fn: (event: any) => void) => listeners.set(name, fn));
  vi.stubGlobal('window', { addEventListener: add }); vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('HTMLInputElement', Input); vi.stubGlobal('HTMLSelectElement', Select);
  const hop = vi.fn(), control = new HopInput({ addEventListener: vi.fn() } as unknown as HTMLCanvasElement, hop);
  control.enabled = true; const button = new Element();
  const event = { key: 'ArrowUp', target: button, repeat: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
  listeners.get('keydown')!(event); expect(hop).toHaveBeenCalledWith('up'); expect(button.blur).toHaveBeenCalled();
  expect(add).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  listeners.get('keydown')!({ ...event, repeat: true }); expect(hop).toHaveBeenCalledTimes(1);
  listeners.get('keyup')!({ ...event, key: ' ' }); expect(event.preventDefault).toHaveBeenCalledTimes(3);
  listeners.get('keydown')!({ ...event, target: new Input() }); expect(hop).toHaveBeenCalledTimes(1);
  control.enabled = false; listeners.get('keydown')!(event); expect(hop).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
