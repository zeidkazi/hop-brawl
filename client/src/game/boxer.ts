import { Object3D, Vector3 } from 'three';
import { BOXER } from '../../../shared/config';

export type BoxerMove = 'idle' | 'tap' | 'combo' | 'shake' | 'hop' | 'punch' | 'stunned' | 'guard' | 'victory';
export type BoxerCue = 'tock' | 'whoosh' | 'hit' | 'win';
const durations: Record<BoxerMove, number> = { idle: Infinity, guard: Infinity, tap: BOXER.TAP_S,
  combo: BOXER.COMBO_S, shake: BOXER.SHAKE_S, hop: BOXER.HOP_S, punch: BOXER.PUNCH_S, stunned: BOXER.STUN_S, victory: BOXER.VICTORY_S };
const pulse = (t: number, peak: number, width: number): number => Math.max(0, 1 - Math.abs(t - peak) / width);

/** One reusable procedural rig for Home, lobby joins and authoritative match events. */
export class Boxer {
  readonly left: Object3D;
  readonly right: Object3D;
  private readonly leftRest: Vector3;
  private readonly rightRest: Vector3;
  private readonly bodyRest: Vector3;
  move: BoxerMove = 'idle';
  reduced = false;
  private start = 0;
  private previous = -1;
  private nextFlourish: number = BOXER.FLOURISH_MIN_S;
  private side = -1;
  private clock = 0;
  review: { move: BoxerMove; elapsed: number } | null = null;
  onCue: ((cue: BoxerCue) => void) | null = null;

  constructor(readonly body: Object3D, private readonly random = Math.random) {
    let left: Object3D | undefined, right: Object3D | undefined;
    body.traverse(node => {
      if (node.name.endsWith('glove_left_handle')) left = node;
      if (node.name.endsWith('glove_right_handle')) right = node;
    });
    this.left = left ?? new Object3D(); this.right = right ?? new Object3D();
    this.leftRest = this.left.position.clone(); this.rightRest = this.right.position.clone(); this.bodyRest = body.position.clone();
  }
  play(move: BoxerMove, side: -1 | 1 = -1): void {
    this.review = null; this.move = move; this.start = this.clock; this.previous = -1; this.side = side;
    this.nextFlourish = this.clock + BOXER.FLOURISH_MIN_S + this.random() * (BOXER.FLOURISH_MAX_S - BOXER.FLOURISH_MIN_S);
    if (move === 'victory') this.onCue?.('win');
  }
  /** Guard at countdown start; the same tap on HOP!, selection landing and joins. */
  countdown(hop = false): void { this.play(hop ? 'tap' : 'guard'); }
  joined(): void { this.play('tap'); }
  landed(): void { this.play('tap'); }
  update(time: number): void {
    this.clock = time;
    let move = this.review?.move ?? this.move;
    let t = this.review?.elapsed ?? time - this.start;
    if (!this.review && t > durations[move]) { this.move = move = 'idle'; t = 0; }
    if (!this.review && !this.reduced && move === 'idle' && time >= this.nextFlourish) {
      this.play((['tap', 'combo', 'shake'] as const)[Math.floor(this.random() * 3)]!); move = this.move; t = 0;
    }
    const left = this.left, right = this.right;
    left.position.copy(this.leftRest); right.position.copy(this.rightRest);
    left.rotation.set(0, 0, 0); right.rotation.set(0, 0, 0);
    this.body.position.copy(this.bodyRest); this.body.rotation.set(0, 0, 0);
    const bounce = Math.sin(time * Math.PI * 2 * BOXER.BOUNCE_HZ);
    this.body.position.y += bounce * BOXER.BOUNCE_HEIGHT * (this.reduced ? 0.5 : 1);
    if (move === 'idle') { left.rotation.x = bounce * BOXER.GUARD_SWAY; right.rotation.x = -left.rotation.x; }
    if (move === 'tap') {
      const amount = Math.max(pulse(t, BOXER.TAP_CONTACTS[0], 0.12), pulse(t, BOXER.TAP_CONTACTS[1], 0.12));
      const gap = (this.rightRest.x - this.leftRest.x) / 2 - 0.12;
      left.position.x += gap * amount; right.position.x -= gap * amount;
      left.position.z -= BOXER.TAP_FORWARD * amount; right.position.z -= BOXER.TAP_FORWARD * amount;
      this.cueAt('tock', t, BOXER.TAP_CONTACTS[0]); this.cueAt('tock', t, BOXER.TAP_CONTACTS[1]);
    } else if (move === 'combo') {
      const jab = pulse(t, BOXER.COMBO_CONTACTS[0], 0.09), cross = pulse(t, BOXER.COMBO_CONTACTS[1], 0.09);
      left.position.z -= jab * BOXER.JAB_DISTANCE; right.position.z -= cross * BOXER.JAB_DISTANCE;
      this.body.rotation.y = (jab - cross) * BOXER.PUNCH_LEAN;
      this.cueAt('whoosh', t, 0.03); this.cueAt('whoosh', t, 0.19);
    } else if (move === 'shake') {
      this.body.rotation.z = Math.sin(t / BOXER.SHAKE_S * Math.PI * 6) * BOXER.SHAKE_ANGLE;
    } else if (move === 'hop') {
      const swing = Math.sin(t / BOXER.HOP_S * Math.PI * 2) * BOXER.HOP_SWING;
      left.rotation.x = right.rotation.x = swing;
    } else if (move === 'punch') {
      const amount = pulse(t, BOXER.PUNCH_CONTACT, BOXER.PUNCH_CONTACT);
      (this.side < 0 ? left : right).position.z -= BOXER.PUNCH_DISTANCE * amount;
      this.body.rotation.x = -BOXER.PUNCH_LEAN * amount;
      this.cueAt('hit', t, BOXER.PUNCH_CONTACT);
    } else if (move === 'stunned' || move === 'victory') {
      const amount = Math.min(1, t / 0.08);
      left.position.y += BOXER.RAISE_HEIGHT * amount; right.position.y += BOXER.RAISE_HEIGHT * amount;
      left.rotation.z = -0.4 * amount; right.rotation.z = 0.4 * amount;
      if (move === 'stunned') this.body.rotation.z = Math.sin(t * 40) * BOXER.STUN_WOBBLE;
      else this.body.position.y += Math.abs(bounce) * BOXER.VICTORY_BOUNCE * (this.reduced ? 0.5 : 1);
    }
    if (!this.review) this.previous = t;
  }
  private cueAt(cue: BoxerCue, time: number, at: number): void {
    if (!this.review && this.previous < at && time >= at) this.onCue?.(cue);
  }
}
