import { describe, expect, it } from 'vitest';
import { FrameWindow, QualityController } from '../../client/src/game/quality';

describe('frame pacing and quality', () => {
  it('measures a rolling window and removes old stalls', () => {
    const frames = new FrameWindow();
    for (let i = 0; i < 100; i++) frames.add(i * 10, i < 90 ? 10 : 30);
    frames.measure(1000);
    expect(frames.p90).toBe(10);
    expect(frames.p95).toBe(30);
    frames.add(4000, 12);
    frames.measure(4000);
    expect(frames.p90).toBe(12);
    expect(frames.worst).toBe(12);
  });
  it('starts phones at Medium, lowers resolution before a sustained tier drop', () => {
    const quality = new QualityController(true);
    expect(quality.tier).toBe('medium');
    expect(quality.pixelRatio(3)).toBe(1.5);
    for (let t = 0; t < 3000; t += 30) quality.sample(t, 30, true);
    expect(quality.tier).toBe('medium');
    expect(quality.resolution).toBe(0.75);
    for (let t = 3000; t < 3500; t += 30) quality.sample(t, 30, true);
    expect(quality.tier).toBe('low');
  });
  it('never auto-raises in a round and honours the manual tier override', () => {
    const quality = new QualityController(false);
    quality.setChoice('low');
    for (let t = 0; t < 10_000; t += 10) quality.sample(t, 10, true);
    expect(quality.tier).toBe('low');
    quality.setChoice('high');
    for (let t = 0; t < 10_000; t += 30) quality.sample(t, 30, true);
    expect(quality.tier).toBe('high');
  });
});
