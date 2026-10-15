import { afterEach, expect, it, vi } from 'vitest';
import { RoomClient } from '../../client/src/game/room-client';
import { RoomGame } from '../../shared/room';

class Socket {
  static OPEN = 1; static instances: Socket[] = [];
  readyState = 1; onmessage: ((event: { data: string }) => void) | null = null;
  constructor() { Socket.instances.push(this); }
  close(): void { this.readyState = 3; }
  send(): void { /* Captured transport is not required for this regression. */ }
}
afterEach(() => { vi.unstubAllGlobals(); Socket.instances = []; });
it('ignores late welcome/state/error frames from a canceled or replaced room', () => {
  vi.stubGlobal('WebSocket', Socket); vi.stubGlobal('window', { setInterval: () => 0 });
  vi.stubGlobal('location', { origin: 'http://localhost' }); vi.stubGlobal('innerWidth', 390); vi.stubGlobal('innerHeight', 844);
  const client = new RoomClient(), onError = vi.fn(), onState = vi.fn(); client.onError = onError; client.onState = onState;
  client.connect('ABCD', 'Player', 2); const old = Socket.instances[0]!;
  client.connect('EFGH', 'Player', 2);
  const room = new RoomGame('ABCD'); room.join('old', 'Player', 2, 1, 0);
  old.onmessage?.({ data: JSON.stringify({ type: 'welcome', id: 'old', snapshot: room.snapshot() }) });
  old.onmessage?.({ data: JSON.stringify({ type: 'error', error: 'ROOM_NOT_FOUND' }) });
  expect(client.state).toBeNull(); expect(client.id).toBe(''); expect(onError).not.toHaveBeenCalled(); expect(onState).not.toHaveBeenCalled();
  client.close(); Socket.instances[1]!.onmessage?.({ data: JSON.stringify({ type: 'welcome', id: 'old', snapshot: room.snapshot() }) });
  expect(client.ready).toBe(false); expect(onState).not.toHaveBeenCalled();
});
