import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { Boxer } from '../../client/src/game/boxer';
import { BOXER } from '../../shared/config';

function rig(random = () => 0): Boxer {
  const body = new Group();
  for (const [side, x] of [['left', -0.4], ['right', 0.4]] as const) {
    const glove = new Group(); glove.name = `fox_glove_${side}_handle`; glove.position.set(x, 0.3, -0.1); body.add(glove);
  }
  return new Boxer(body, random);
}
describe('boxer event choreography', () => {
  it('taps twice and returns both wrist pivots to guard', () => {
    const boxer = rig(), cues: string[] = []; boxer.onCue = cue => cues.push(cue);
    boxer.play('tap'); boxer.update(0.13); expect(boxer.left.position.x).toBeGreaterThan(-0.2);
    boxer.update(0.33); expect(cues).toEqual(['tock', 'tock']);
    boxer.update(0.6); expect(boxer.move).toBe('idle'); expect(boxer.left.position.x).toBe(-0.4);
  });
  it('alternates the 350 ms combo and extends only the shove-side glove by 0.4 tile', () => {
    const boxer = rig(); boxer.play('combo'); boxer.update(0.1);
    expect(boxer.left.position.z).toBeCloseTo(-0.1 - BOXER.JAB_DISTANCE);
    expect(boxer.right.position.z).toBe(-0.1);
    boxer.update(0.26); expect(boxer.right.position.z).toBeCloseTo(-0.1 - BOXER.JAB_DISTANCE);
    boxer.play('punch', 1); boxer.update(0.38);
    expect(boxer.right.position.z).toBeCloseTo(-0.5); expect(boxer.left.position.z).toBe(-0.1);
  });
  it('supports hop follow-through, stun, guard, HOP, lobby join and victory events', () => {
    const boxer = rig(); boxer.play('hop'); boxer.update(0.035); expect(boxer.left.rotation.x).toBeGreaterThan(0);
    boxer.update(0.105); expect(boxer.left.rotation.x).toBeLessThan(0);
    boxer.play('stunned'); boxer.update(0.205); expect(boxer.left.position.y).toBeGreaterThan(0.8);
    boxer.countdown(); expect(boxer.move).toBe('guard'); boxer.countdown(true); expect(boxer.move).toBe('tap');
    boxer.joined(); expect(boxer.move).toBe('tap'); boxer.landed(); expect(boxer.move).toBe('tap');
    const cues: string[] = []; boxer.onCue = cue => cues.push(cue); boxer.play('victory'); boxer.update(0.4);
    expect(cues).toEqual(['win']); expect(boxer.left.position.y).toBeGreaterThan(0.8); expect(boxer.right.position.y).toBeGreaterThan(0.8);
  });
  it('halves the bounce and never starts an automatic flourish with Reduce Motion', () => {
    const a = rig(), b = rig(); b.reduced = true;
    a.update(0.125); b.update(0.125); expect(b.body.position.y).toBeCloseTo(a.body.position.y / 2);
    b.update(10); expect(b.move).toBe('idle'); a.update(10); expect(a.move).toBe('tap');
  });
});
