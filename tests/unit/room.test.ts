import { describe, expect, it } from 'vitest';
import { RoomGame } from '../../shared/room';
import { CONFIG, ROOM } from '../../shared/config';

function room(count = 2) {
  let seed = 40; const game = new RoomGame('ABCD', () => ++seed);
  for (let i = 0; i < count; i++) expect(game.join(String(i), `Player ${i}`, i, 1.6, 0)).toBeNull();
  return game;
}
function playing(count = 2) { const game = room(count); game.start('0', 0); game.tick(ROOM.COUNTDOWN_MS); return game; }
function position(game: RoomGame, index: number, x: number, z = 3) {
  const p = game.players[index]!; p.move.x = p.move.fromX = p.move.toX = x; p.move.z = p.move.fromZ = p.move.toZ = z;
}
function eliminate(game: RoomGame, index: number, now: number) {
  const p = game.players[index]!; p.hearts = 1; p.move.dead = 'FLATTENED!'; game.tick(now); game.tick(now + CONFIG.TIE_WINDOW_MS);
}
describe('private room authority', () => {
  it('enforces capacity, host-only start, unique animals and host handoff', () => {
    const game = room(4); expect(game.join('4', 'Fifth', 4, 1, 0)).toBe('ROOM_FULL');
    expect(game.choose('1', 0)).toBe(false); expect(game.choose('1', 5)).toBe(true);
    expect(game.start('1', 0)).toBe(false); game.leave('0', 0); expect(game.host).toBe('1');
    expect(game.start('1', 0)).toBe(true);
  });
  it.each([2, 3, 4])('starts %s players in the prescribed unique spawn columns', count => {
    const game = playing(count);
    expect(game.players.map(p => p.move.x)).toEqual(ROOM.SPAWNS[count - 2]);
    expect(game.players.every(p => p.hearts === 2)).toBe(true);
  });
  it('ignores countdown inputs and stale/replayed input sequence numbers', () => {
    const game = room(); game.start('0', 0); expect(game.hop('0', 'up', 1, 100)).toBe(false);
    game.tick(3000); expect(game.hop('0', 'up', 2, 3000)).toBe(true);
    game.tick(3140); expect(game.hop('0', 'up', 2, 3140)).toBe(false); expect(game.players[0]!.move.z).toBe(2);
  });
  it('buffers only one input and rechecks occupancy before the buffered hop', () => {
    const game = playing(); game.hop('0', 'up', 1, 3000); game.hop('0', 'up', 2, 3010); game.hop('0', 'left', 3, 3020);
    game.tick(3280); expect(game.players[0]!.move.toZ).toBe(3); expect(game.players[0]!.move.toX).toBe(3);
  });
  it('persists complete lobby and live movement state across hibernation/restart', () => {
    const game = playing(); game.hop('0', 'up', 1, 3000); game.tick(3070);
    const restored = new RoomGame('ABCD'); restored.restore(JSON.parse(JSON.stringify(game.snapshot())));
    expect(restored.snapshot()).toEqual(game.snapshot()); restored.tick(3140); game.tick(3140);
    expect(restored.snapshot()).toEqual(game.snapshot());
  });
  it('aborts countdown below two and grants match forfeit during play', () => {
    const game = room(); game.start('0', 0); game.leave('1', 1); expect(game.phase).toBe('lobby');
    const active = playing(); active.leave('0', 3100); expect(active.phase).toBe('matchEnd'); expect(active.winner).toBe('1');
  });
  it('waits mid-match joins until Rematch or Back to lobby', () => {
    const game = playing(); game.join('2', 'Waiting', 2, 1, 3100); expect(game.players[2]!.waiting).toBe(true);
    game.phase = 'matchEnd'; game.start('0', 3200); expect(game.players.every(p => !p.waiting)).toBe(true);
    game.phase = 'matchEnd'; game.camZ = 90; expect(game.lobby('1', 3300)).toBe(false); expect(game.lobby('0', 3300)).toBe(true);
    expect(game.camZ).toBe(0); expect(game.startAt).toBe(0);
  });
});
describe('authoritative shove', () => {
  it('pushes the victim, leaves shover stationary, and applies stun/proof/cooldown', () => {
    const game = playing(); position(game, 0, 3); position(game, 1, 4);
    expect(game.hop('0', 'right', 1, 3000)).toBe(true);
    expect(game.players[0]!.move.x).toBe(3); expect(game.players[1]!.move.toX).toBe(5);
    expect(game.players[0]!.move.direction).toBe('right');
    expect(game.players[1]!.stunUntil).toBe(3300); expect(game.players[1]!.proofUntil).toBe(4800);
    expect(game.players[0]!.cooldownUntil).toBe(5500); expect(game.hop('1', 'up', 1, 3050)).toBe(false);
    game.tick(3140); expect(game.players[1]!.move.x).toBe(5);
  });
  it('blocked side-edge and third-player shoves cannot kill or overlap', () => {
    const game = playing(3); position(game, 0, 7); position(game, 1, 8); position(game, 2, 6);
    expect(game.hop('0', 'right', 1, 3000)).toBe(false); expect(game.players[1]!.hearts).toBe(2);
    position(game, 0, 3); position(game, 1, 4); position(game, 2, 5);
    expect(game.hop('0', 'right', 2, 3000)).toBe(false); expect(game.players[1]!.move.x).toBe(4);
  });
  it('spawn protection prevents giving and receiving shoves; cooldown blocks another shove', () => {
    const game = playing(); position(game, 0, 3); position(game, 1, 4);
    game.players[1]!.move.invulnerableUntil = 2; expect(game.hop('0', 'right', 1, 3000)).toBe(false);
    game.players[1]!.move.invulnerableUntil = 0; game.players[0]!.move.invulnerableUntil = 2;
    expect(game.hop('0', 'right', 2, 3000)).toBe(false);
    game.players[0]!.move.invulnerableUntil = 0; game.players[0]!.cooldownUntil = 5500;
    expect(game.hop('0', 'right', 3, 3000)).toBe(false);
  });
  it('attributes a hazard death within the two-second shove window', () => {
    const game = playing(); position(game, 0, 3); position(game, 1, 4); game.hop('0', 'right', 1, 3000);
    game.players[1]!.move.dead = 'FLATTENED!'; game.tick(3050);
    expect(game.events.at(-1)?.by).toBe('0'); expect(game.events.at(-1)?.kind).toBe('death');
  });
});
describe('hearts, respawn and rounds', () => {
  it('loses one heart, waits 1.5 seconds, respawns free with two-second protection', () => {
    const game = playing(); const p = game.players[1]!; p.move.dead = 'FLATTENED!'; game.tick(3050);
    expect(p.hearts).toBe(1); game.tick(4549); expect(p.move.dead).toBe('FLATTENED!');
    game.tick(4550); expect(p.move.dead).toBeNull(); expect(p.move.invulnerableUntil).toBeCloseTo(3.55);
    expect(game.players[0]!.move.x !== p.move.x || game.players[0]!.move.z !== p.move.z).toBe(true);
  });
  it('plays a full match, first to two, and resets wins/seed on rematch', () => {
    const game = playing(); eliminate(game, 1, 3050); expect(game.phase).toBe('freeze'); expect(game.players[0]!.wins).toBe(1);
    game.tick(game.nextAt); expect(game.phase).toBe('roundEnd'); game.tick(game.nextAt); expect(game.phase).toBe('countdown');
    const seed = game.seed; game.tick(game.nextAt); eliminate(game, 1, game.now + 50);
    game.tick(game.nextAt); game.tick(game.nextAt); expect(game.phase).toBe('matchEnd'); expect(game.winner).toBe('0');
    expect(game.start('0', game.now)).toBe(true); expect(game.seed).not.toBe(seed); expect(game.players[0]!.wins).toBe(0);
  });
  it('simultaneous equal-distance knockout is a draw and repeats the round', () => {
    const game = playing(); for (const p of game.players) { p.hearts = 1; p.move.dead = 'SPLASH!'; }
    game.tick(3050); game.tick(3250); expect(game.winner).toBe(''); expect(game.phase).toBe('freeze');
    game.tick(game.nextAt); game.tick(game.nextAt); expect(game.round).toBe(1); expect(game.phase).toBe('countdown');
  });
  it('four-minute cap uses distance, hearts, then earliest distance time', () => {
    const game = playing(); for (const p of game.players) { p.move.distance = 20; p.move.advance = () => {}; }
    game.players[0]!.reachedAt = 100; game.players[1]!.reachedAt = 200;
    game.tick(game.startAt + CONFIG.ROUND_CAP_S * 1000); expect(game.winner).toBe('0');
  });
  it('three different round winners resolve the match by total distance without Showdown', () => {
    const game = playing(3);
    for (let round = 0; round < 3; round++) {
      for (const [i, p] of game.players.entries()) {
        p.move.distance = i === 1 ? 30 : 10;
        if (i !== round) { p.hearts = 1; p.move.dead = 'FLATTENED!'; }
      }
      game.tick(game.now + 50); game.tick(game.now + CONFIG.TIE_WINDOW_MS);
      expect(game.winner).toBe(String(round)); game.tick(game.nextAt); game.tick(game.nextAt);
      if (round < 2) game.tick(game.nextAt);
    }
    expect(game.phase).toBe('matchEnd'); expect(game.players.map(p => p.wins)).toEqual([1, 1, 1]);
    expect(game.winner).toBe('1'); expect(game.round).toBe(3);
  });
});

