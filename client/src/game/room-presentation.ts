import type { PlayerState, RoomSnapshot } from '../../../shared/room';
export function lobbyControls(state: RoomSnapshot, id: string) {
  const host = state.host === id, count = state.players.filter(p => p.connected).length;
  return { hidden: !host, disabled: count < 2,
    status: !host ? 'Waiting for host…' : count < 2 ? 'Need 1 more player' : `${count} players ready` };
}
/** Lobby traffic uses the continuous renderer clock, never the time of a lobby mutation. */
export function roomWorldTime(state: RoomSnapshot, liveTime: number, lobbyTime: number): number {
  return state.phase === 'lobby' ? lobbyTime : state.phase === 'playing' ? liveTime : Math.max(0, (state.now - state.startAt) / 1000);
}
/** Choose an authoritative trajectory, not a blend of two positions or two different lives. */
export function remoteMovement(a: PlayerState, b: PlayerState, time: number) {
  if (a.lifeId !== b.lifeId || time >= b.movement.time) return b.movement;
  return b.movement.hopStart <= time && !b.movement.dead ? b.movement : a.movement;
}
