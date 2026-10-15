import { expect, it } from 'vitest';
import { RoomGame } from '../../shared/room';
import { lobbyControls, roomWorldTime } from '../../client/src/game/room-presentation';
it('keeps host start disabled until two players and hides it for guests, including host handoff', () => {
  const room = new RoomGame('ABCD'); room.join('a', 'A', 0, 1, 0);
  expect(lobbyControls(room.snapshot(), 'a')).toEqual({ hidden: false, disabled: true, status: 'Need 1 more player' });
  room.join('b', 'B', 1, 1, 1000);
  expect(lobbyControls(room.snapshot(), 'a').disabled).toBe(false);
  expect(lobbyControls(room.snapshot(), 'b')).toEqual({ hidden: true, disabled: false, status: 'Waiting for host…' });
  room.leave('a', 2000); expect(lobbyControls(room.snapshot(), 'b').hidden).toBe(false);
});
it('animal picks and all lobby mutations preserve advancing traffic and world identity', () => {
  const room = new RoomGame('ABCD'); room.join('a', 'A', 0, 1, 1000);
  const first = room.snapshot(); expect(roomWorldTime(first, 100, 1)).toBe(1);
  room.choose('a', 2); room.join('b', 'B', 1, 1, 9000); room.leave('b', 10000);
  const next = room.snapshot(); expect(next.seed).toBe(first.seed); expect(next.startAt).toBe(first.startAt);
  expect(roomWorldTime(next, 500, 2)).toBe(2);
  room.start('a', 10000); expect(roomWorldTime(room.snapshot(), 500, 3)).toBe(3);
});
