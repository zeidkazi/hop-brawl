import { describe, expect, it } from 'vitest';
import { MatchQueue, quickName } from '../../shared/matchmaking';
import { RoomGame } from '../../shared/room';
import { CONFIG, ROOM } from '../../shared/config';

const player = (id: string) => ({ id, name: id, animal: 2, joinedAt: Number(id) });
describe('Quick Match FIFO and connection timeout', () => {
  it('keeps ordinary names and replaces blocklisted public names with Hopper plus four digits', () => {
    expect(quickName('Fox friend', 7)).toBe('Fox friend');
    expect(quickName('S.H.I.T', 10007)).toBe('Hopper0007');
  });
  it('pairs the first two live players and never pairs a player twice', () => {
    const q = new MatchQueue(); ['1', '2', '3', '4'].forEach(id => q.add(player(id)));
    const live = new Set(['1', '3', '4']); const pair = q.candidates(live);
    expect(pair.map(p => p.id)).toEqual(['1', '3']); q.paired('ABCD', pair, ['a', 'b'], 100);
    q.add(player('1')); expect(q.queue.map(p => p.id)).toEqual(['4']);
    expect(q.pairs[0]!.deadline).toBe(100 + CONFIG.QUICK_CONNECT_TIMEOUT_S * 1000);
  });
  it('cancel and socket close immediately remove a queued player', () => {
    const q = new MatchQueue(); q.add(player('1')); q.add(player('2')); q.cancel('1'); q.cancel('1');
    expect(q.candidates(new Set(['1', '2'])).map(p => p.id)).toEqual(['2']);
    expect(q.candidates(new Set())).toEqual([]);
  });
  it('returns only the connected, still-live survivor to the front, exactly once', () => {
    const q = new MatchQueue(); q.paired('ABCD', [player('1'), player('2')], ['a', 'b'], 0); q.add(player('3'));
    expect(q.retry('ABCD', new Set(['2']), new Set(['1', '2', '3'])).map(p => p.id)).toEqual(['2']);
    expect(q.queue.map(p => p.id)).toEqual(['2', '3']); expect(q.retry('ABCD', new Set(['2']), new Set(['2']))).toEqual([]);
  });
  it('does not requeue a canceled or closed survivor and persists FIFO across hibernation', () => {
    const q = new MatchQueue(); q.paired('ABCD', [player('1'), player('2')], ['a', 'b'], 0); q.add(player('3'));
    const restored = Object.assign(new MatchQueue(), JSON.parse(JSON.stringify(q)));
    expect(restored.retry('ABCD', new Set(['1']), new Set(['3']))).toEqual([]);
    expect(restored.queue).toEqual([player('3')]);
  });
});
function quick() {
  const g = new RoomGame('ABCD', () => 40); g.quick = true;
  g.join('a', 'Alice', 0, 1.6, 0); g.join('b', 'Bob', 2, 1.6, 1); return g;
}
describe('hostless Quick Match and rematch', () => {
  it('preserves matching animal choices for the second player golden palette and locks assigned picks', () => {
    const g = new RoomGame('ABCD'); g.quick = true;
    g.join('a', 'Alice', 2, 1, 0); expect(g.choose('a', 4)).toBe(false); g.join('b', 'Bob', 2, 1, 1);
    expect(g.players.map(p => [p.animal, p.slot])).toEqual([[2, 0], [2, 1]]);
  });
  it('auto-starts only when the assigned two players join; private controls stay disabled', () => {
    const g = new RoomGame('ABCD'); g.quick = true; g.join('a', 'Alice', 0, 1, 0);
    expect(g.phase).toBe('lobby'); expect(g.start('a', 1)).toBe(false);
    g.join('b', 'Bob', 2, 1, 2); expect(g.phase).toBe('countdown'); expect(g.host).toBe('');
    expect(g.join('c', 'Third', 3, 1, 3)).toBe('ROOM_FULL'); expect(g.lobby('', 4)).toBe(false);
  });
  it('requires both votes, rejects repeats and strangers, resets the best-of-three', () => {
    const g = quick(); g.phase = 'matchEnd'; g.rematchUntil = 20000; g.players[0]!.wins = 2;
    expect(g.rematch('stranger', 10)).toBe(false); expect(g.rematch('a', 10)).toBe(true); g.rematch('a', 11);
    expect(g.rematchReady).toEqual(['a']); expect(g.phase).toBe('matchEnd');
    const restored = new RoomGame('ABCD'); restored.restore(g.snapshot());
    expect(restored.rematch('b', 19999)).toBe(true); expect(restored.phase).toBe('countdown');
    expect(restored.players.map(p => p.wins)).toEqual([0, 0]); expect(restored.rematchReady).toEqual([]);
  });
  it('expires at 20 seconds and cannot rematch a departed opponent', () => {
    const g = quick(); g.phase = 'matchEnd'; g.rematchUntil = 20000; g.rematch('a', 1);
    expect(g.rematch('b', 20000)).toBe(false); g.leave('b', 100); expect(g.rematch('a', 101)).toBe(false);
  });
  it('aborts countdown when a player leaves, but forfeits after play begins', () => {
    const g = quick(); g.leave('a', 2); expect(g.phase).toBe('lobby');
    const active = quick(); active.tick(ROOM.COUNTDOWN_MS + 1); active.leave('a', 4000);
    expect(active.phase).toBe('matchEnd'); expect(active.winner).toBe('b');
  });
});
