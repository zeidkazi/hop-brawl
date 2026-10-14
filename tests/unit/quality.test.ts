import { describe, expect, it } from 'vitest';
import { FrameWindow, QualityController } from '../../client/src/game/quality';

describe('frame pacing and quality', () => {
  it('restores full menu resolution immediately and never lowers it in menus', () => {
    const quality = new QualityController(true);
    quality.resolution = 0.75;
    expect(quality.pixelRatio(2, false)).toBe(1.5);
    expect(quality.sample(0, 30, false)).toBe(true);
    for (let t = 30; t < 5000; t += 30) quality.sample(t, 30, false);
    expect(quality.resolution).toBe(1);
    expect(quality.tier).toBe('low');
  });
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
  it('keeps an automatically lowered tier during play, then permits menu recovery', () => {
    const quality = new QualityController(true);
    for (let t = 0; t < 4000; t += 30) quality.sample(t, 30, true);
    expect(quality.tier).toBe('low');
    for (let t = 4000; t < 12000; t += 10) quality.sample(t, 10, true);
    expect(quality.tier).toBe('low');
    for (let t = 12000; t < 16000; t += 10) quality.sample(t, 10, false);
    expect(quality.tier).toBe('medium');
  });
});
