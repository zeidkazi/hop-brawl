import { describe, expect, it } from 'vitest';
import { Movement } from '../../shared/movement';
import type { Row } from '../../shared/types';

const grass = (z: number): Row => ({ kind: 'grass', z, biome: 'meadow', obstacles: [], crate: null });
describe('Solo/shared movement', () => {
  it('accepts one buffered hop and drops further inputs, with 140 ms hops', () => {
    const player = new Movement(grass);
    player.input('up'); player.input('right'); player.input('left');
    player.advance(.14); expect(player.z).toBe(2); expect(player.hopping).toBe(true);
    player.advance(.28); expect(player.x).toBe(5); expect(player.z).toBe(2); expect(player.hopping).toBe(false);
    expect(player.distance).toBe(2);
  });
  it('bonks on obstacles, sides and the top limit without damage', () => {
    const player = new Movement(z => z === 2 ? { ...grass(z), kind: 'grass', obstacles: [{ column: 4, kind: 'tree' }], crate: null } : grass(z));
    expect(player.input('up')).toBe(false); expect(player.dead).toBeNull();
    player.x = 0; expect(player.input('left')).toBe(false);
    player.x = 4; player.z = 11; expect(player.input('up')).toBe(false);
  });
  it('switches hazard rows halfway through a hop', () => {
    const player = new Movement(z => z === 2 ? { kind: 'road', z, biome: 'meadow', direction: 1, speed: 0, phase: 0,
      vehicles: [{ offset: 10, length: 1, kind: 'car' }] } : grass(z));
    player.input('up'); player.advance(.069); expect(player.dead).toBeNull();
    player.advance(.071); expect(player.dead).toBe('FLATTENED!');
  });
  it('checks water at landing, carries fractional log positions, and kills at the edge', () => {
    const player = new Movement(z => z === 2 ? { kind: 'river', z, biome: 'meadow', direction: 1, speed: 1, phase: 0,
      logs: [{ offset: 10, length: 4 }] } : grass(z));
    player.input('up'); player.advance(.14); expect(player.onLog).toBe(true);
    player.advance(.64); expect(player.x).toBeCloseTo(4.5);
    player.x = 8.49; player.advance(.66); expect(player.dead).toBe('SWEPT AWAY!');
    const empty = new Movement(z => z === 2 ? { kind: 'river', z, biome: 'meadow', direction: 1, speed: 1, phase: 0, logs: [] } : grass(z));
    empty.input('up'); empty.advance(.139); expect(empty.dead).toBeNull();
    empty.advance(.14); expect(empty.dead).toBe('SPLASH!');
  });
  it('uses the other neighbouring column when leaving a log beside an obstacle', () => {
    const player = new Movement(z => z === 2 ? { ...grass(z), kind: 'grass', obstacles: [{ column: 4, kind: 'tree' }], crate: null } : grass(z));
    player.x = 4.2; player.onLog = true;
    expect(player.input('up')).toBe(true); expect(player.toX).toBe(5);
  });
  it('advances camera after the delay and never moves it backwards', () => {
    const player = new Movement(grass); player.z = 4; player.input('right');
    player.advance(2.99); expect(player.camZ).toBe(0);
    player.advance(4); expect(player.camZ).toBeGreaterThan(.25);
    const cam = player.camZ; player.z = 1; player.advance(4.1); expect(player.camZ).toBeGreaterThanOrEqual(cam);
    player.advance(20); expect(player.dead).toBe('LEFT BEHIND!');
  });
  it('blocks both occupied log-exit neighbours and preserves fractional lateral hops', () => {
    const rowAt = (z: number): Row => z === 2 ? { kind: 'river', z, biome: 'meadow', direction: 1, speed: 1, phase: 0, logs: [{ offset: 10, length: 4 }] }
      : { kind: 'grass', z, biome: 'meadow', obstacles: [{ column: 4, kind: 'tree' }, { column: 5, kind: 'rock' }], crate: null };
    const player = new Movement(rowAt); player.x = 4.2; player.z = 2; player.onLog = true;
    expect(player.input('up')).toBe(false); expect(player.onLog).toBe(true); expect(player.x).toBe(4.2);
    expect(player.input('right')).toBe(true); expect(player.toX).toBe(5.2);
  });
  it('never auto-scrolls before the first hop and starts three seconds after it', () => {
    const player = new Movement(grass);
    player.advance(30); expect(player.camZ).toBe(0); expect(player.dead).toBeNull();
    player.input('up'); player.advance(32.999); expect(player.camZ).toBe(0);
    player.advance(33.1); expect(player.camZ).toBeGreaterThan(0);
    player.reset(); expect(player.firstHopAt).toBeNull();
  });
  it('catches a vehicle passing completely through during a long frame and uses full train length', () => {
    const car = new Movement(z => ({ kind: 'road', z, biome: 'meadow', direction: 1, speed: 10, phase: 0, vehicles: [{ offset: 4, length: 1, kind: 'car' }] }));
    car.advance(1); expect(car.dead).toBe('FLATTENED!'); expect(car.time).toBeLessThan(1);
    const train = new Movement(z => ({ kind: 'rail', z, biome: 'meadow', direction: 1, phase: .58, period: 8 }));
    train.advance(.01); expect(train.dead).toBe('DERAILED!');
  });
});
