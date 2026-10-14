import { describe, expect, it } from 'vitest';
import { effectiveTime, slowMoWindow } from '../../shared/hazards';

describe('slow-mo time warp', () => {
  it('slows a three-second window once and retains the offset afterwards', () => {
    const windows = [slowMoWindow(2)];
    expect(effectiveTime(1, windows)).toBe(1);
    expect(effectiveTime(2, windows)).toBe(2);
    expect(effectiveTime(3, windows)).toBe(2.5);
    expect(effectiveTime(5, windows)).toBe(3.5);
    expect(effectiveTime(10, windows)).toBe(8.5);
  });

  it('unions overlapping, nested, duplicate and touching windows in any order', () => {
    const windows = [slowMoWindow(4), slowMoWindow(2), slowMoWindow(7), slowMoWindow(2), { start: 3, end: 4 }];
    // Union [2, 10], independent of order and repeated pickup messages.
    expect(effectiveTime(10, windows)).toBe(6);
    expect(effectiveTime(10, [...windows].reverse())).toBe(6);
    expect(effectiveTime(6, windows)).toBe(4);
  });

  it('handles separate windows, future windows and clipping to round start', () => {
    expect(effectiveTime(12, [slowMoWindow(1), slowMoWindow(7)])).toBe(9);
    expect(effectiveTime(2, [slowMoWindow(4)])).toBe(2);
    expect(effectiveTime(4, [{ start: -1, end: 1 }])).toBe(3.5);
    expect(effectiveTime(-1, [slowMoWindow(0)])).toBe(-1);
    expect(effectiveTime(20)).toBe(20);
    expect(effectiveTime(20, [{ start: 5, end: 4 }])).toBe(20);
  });

  it('is continuous and never moves hazards backwards at window boundaries', () => {
    const windows = [slowMoWindow(1), slowMoWindow(3), slowMoWindow(8)];
    let previous = effectiveTime(0, windows);
    for (let i = 1; i <= 1200; i++) {
      const next = effectiveTime(i / 100, windows);
      const delta = next - previous;
      expect(delta).toBeGreaterThanOrEqual(0.005 - 1e-10);
      expect(delta).toBeLessThanOrEqual(0.01 + 1e-10);
      previous = next;
    }
  });
});
