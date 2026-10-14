import { CONFIG, ROOM } from '../../../shared/config';
import { Movement } from '../../../shared/movement';
import type { HopDirection } from '../../../shared/movement';
import type { RoomSnapshot } from '../../../shared/room';
import { generateRow } from '../../../shared/worldgen';

export class RoomClient {
  id = ''; state: RoomSnapshot | null = null; offset = 0; sequence = 0; ready = false;
  readonly prediction = new Movement(z => generateRow(this.state?.seed ?? 0, z));
  readonly history: RoomSnapshot[] = [];
  onState: ((state: RoomSnapshot) => void) | null = null;
  onError: ((error: string) => void) | null = null;
  private socket: WebSocket | null = null;
  private pending: { direction: HopDirection; sequence: number; time: number }[] = [];
  private heartbeat = 0; private lastClock = 0; private lastMessage = 0;
  get now(): number { return Date.now() + this.offset; }
  get time(): number { return this.state ? Math.max(0, (this.now - this.state.startAt) / 1000) : 0; }
  get base(): string { return import.meta.env.VITE_SERVER_URL || location.origin; }
  async create(): Promise<{ code: string; token: string }> {
    const response = await fetch(new URL('/api/rooms', this.base), { method: 'POST' });
    if (!response.ok) throw new Error('Could not create a room. Please try again.');
    return response.json() as Promise<{ code: string; token: string }>;
  }
  connect(code: string, name: string, animal: number, token = ''): void {
    this.close(); this.id = ''; this.state = null; this.history.length = this.pending.length = 0; this.sequence = 0;
    const url = new URL(`/ws/room/${code}`, this.base); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = new URLSearchParams({ name, animal: String(animal), aspect: String(innerWidth / innerHeight), token }).toString();
    const socket = this.socket = new WebSocket(url); let failed = false;
    socket.onopen = () => { this.lastMessage = Date.now(); this.clock(); };
    socket.onmessage = event => {
      this.lastMessage = Date.now(); if (event.data === 'pong') return;
      const data = JSON.parse(String(event.data)) as { type: string; id: string; snapshot: RoomSnapshot; now: number; sent: number; error: string };
      if (data.type === 'error') { failed = true; this.onError?.(data.error); }
      else if (data.type === 'clock') this.offset = data.now - (Date.now() + data.sent) / 2;
      else if (data.type === 'welcome' || data.type === 'state') {
        if (data.type === 'welcome') { this.id = data.id; this.offset = data.snapshot.now - Date.now(); }
        const changed = this.state?.startAt !== data.snapshot.startAt;
        this.state = data.snapshot; this.ready = true;
        if (changed) { this.pending.length = 0; this.history.length = 0; }
        this.history.push(data.snapshot); while (this.history.length > ROOM.MAX_PENDING) this.history.shift();
        const me = data.snapshot.players.find(p => p.id === this.id);
        if (me) {
          this.prediction.restore(me.movement);
          this.prediction.externalCamera = true;
          this.pending = this.pending.filter(input => input.sequence > me.sequence);
          if (data.snapshot.phase === 'playing' && !me.movement.dead) {
            for (const input of this.pending) { this.prediction.advance(Math.max(this.prediction.time, input.time)); this.prediction.input(input.direction); }
            this.prediction.advance(Math.max(this.prediction.time, this.time));
          }
        }
        this.onState?.(data.snapshot);
      }
    };
    socket.onclose = () => { if (this.socket === socket) { this.ready = false; if (!failed) this.onError?.('Connection closed. Join the room again.'); } };
    socket.onerror = () => { failed = true; this.onError?.('Cannot reach room. Check the code and connection.'); };
    this.heartbeat = window.setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send('ping');
      if (Date.now() - this.lastClock >= ROOM.CLOCK_SYNC_MS) this.clock();
      if (this.state?.phase === 'playing' && Date.now() - this.lastMessage > ROOM.STALE_MS) { this.ready = false; this.sync(); }
    }, ROOM.PING_MS);
  }
  send(message: object): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  clock(): void { this.lastClock = Date.now(); this.send({ type: 'clock', sent: this.lastClock }); }
  sync(): void { this.ready = false; this.clock(); this.send({ type: 'sync', aspect: innerWidth / innerHeight }); }
  hop(direction: HopDirection): void {
    const state = this.state, me = state?.players.find(p => p.id === this.id);
    if (!this.ready || state?.phase !== 'playing' || !me || me.waiting || me.hearts <= 0 || me.movement.dead || this.now < me.stunUntil) return;
    const sequence = ++this.sequence, time = this.time;
    this.send({ type: 'hop', direction, sequence });
    if (this.pending.length >= ROOM.MAX_PENDING) return;
    const before = this.prediction.save(); this.prediction.advance(Math.max(time, before.time)); this.prediction.input(direction);
    const occupied = state.players.some(p => p.id !== this.id && p.connected && !p.waiting && !p.movement.dead && p.hearts > 0
      && Math.round(p.movement.x) === Math.round(this.prediction.toX) && Math.round(p.movement.z) === this.prediction.toZ);
    if (occupied) this.prediction.restore(before);
    else this.pending.push({ direction, sequence, time });
  }
  advance(): void {
    if (this.ready && this.state?.phase === 'playing') this.prediction.advance(Math.max(this.prediction.time, this.time));
  }
  pair(): { a: RoomSnapshot; b: RoomSnapshot; mix: number } | null {
    if (!this.history.length) return null;
    const at = this.now - CONFIG.INTERP_DELAY_MS;
    let a = this.history[0]!, b = this.history.at(-1)!;
    for (const snapshot of this.history) { if (snapshot.now <= at) a = snapshot; else { b = snapshot; break; } }
    return { a, b, mix: Math.max(0, Math.min(1, (at - a.now) / Math.max(1, b.now - a.now))) };
  }
  close(): void {
    const socket = this.socket; this.socket = null; this.ready = false;
    clearInterval(this.heartbeat); socket?.close(1000, 'Left room');
  }
}
