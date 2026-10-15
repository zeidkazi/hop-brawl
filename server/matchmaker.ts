import { DurableObject } from 'cloudflare:workers';
import { ANIMALS, ROOM, VIEW } from '../shared/config';
import { MatchQueue, quickName } from '../shared/matchmaking';
import type { SearchPlayer } from '../shared/matchmaking';
import type { Env } from './index';

interface Attachment { player: SearchPlayer; canceled: boolean }
/** No interval: idle queue sockets hibernate; only outstanding pairs need an alarm. */
export class Matchmaker extends DurableObject<Env> {
  private queue = new MatchQueue();
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    void ctx.blockConcurrencyWhile(async () => {
      Object.assign(this.queue, await ctx.storage.get('queue') ?? {});
    });
  }
  private sockets(): Map<string, WebSocket> {
    const sockets = new Map<string, WebSocket>();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attachment;
      if (!a.canceled && ws.readyState === WebSocket.OPEN) sockets.set(a.player.id, ws);
    }
    return sockets;
  }
  private send(ws: WebSocket | undefined, body: object): void {
    try { ws?.send(JSON.stringify(body)); } catch { /* Close callback prunes the queue. */ }
  }
  async fetch(request: Request): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const url = new URL(request.url);
      if (url.pathname === '/finished') {
        const body = await request.json<{ code: string; started: boolean; tokens: string[] }>();
        await this.finish(body.code, body.started, body.tokens);
        await this.pair(); return new Response('OK');
      }
      const name = url.searchParams.get('name')?.trim() ?? '', animal = Number(url.searchParams.get('animal'));
      if (!name || name.length > VIEW.NAME_MAX_LENGTH || !Number.isInteger(animal) || animal < 0 || animal >= ANIMALS.length) return new Response('Invalid player', { status: 400 });
      const pair = new WebSocketPair(), player = { id: crypto.randomUUID(), name: quickName(name, crypto.getRandomValues(new Uint32Array(1))[0]!), animal, joinedAt: Date.now() };
      this.ctx.acceptWebSocket(pair[1], [player.id]); pair[1].serializeAttachment({ player, canceled: false } satisfies Attachment);
      this.queue.add(player); await this.pair();
      return new Response(null, { status: 101, webSocket: pair[0] });
    });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // The sole client command is cancellation; pairing and readiness are server-owned.
    if (message === 'cancel') await this.remove(ws);
    else { ws.close(1008, 'Invalid message'); await this.remove(ws); }
  }
  async webSocketClose(ws: WebSocket): Promise<void> { await this.remove(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.remove(ws); }
  private async remove(ws: WebSocket): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const a = ws.deserializeAttachment() as Attachment;
      a.canceled = true; ws.serializeAttachment(a); this.queue.cancel(a.player.id);
      try { ws.close(1000, 'Search canceled'); } catch { /* Closed already. */ }
      await this.pair();
    });
  }
  private async pair(): Promise<void> {
    const sockets = this.sockets(), live = new Set(sockets.keys());
    while (this.queue.candidates(live).length >= 2) {
      const players = this.queue.candidates(live), tokens = players.map(() => crypto.randomUUID());
      let code = '';
      for (let attempt = 0; attempt < ROOM.CREATE_ATTEMPTS; attempt++) {
        const candidate = [...crypto.getRandomValues(new Uint32Array(ROOM.CODE_LENGTH))].map(n => ROOM.CODE_ALPHABET[n % ROOM.CODE_ALPHABET.length]).join('');
        const result = await this.env.ROOMS.get(this.env.ROOMS.idFromName(candidate)).fetch('https://room/create', {
          method: 'POST', body: JSON.stringify({ code: candidate, token: '', assignments: players.map((p, i) => ({ ...p, token: tokens[i] })) }),
        });
        if (result.ok) { code = candidate; break; }
      }
      if (!code) {
        for (const p of players) { this.send(sockets.get(p.id), { type: 'error', error: 'Could not find a room. Please try again.' }); this.queue.cancel(p.id); }
        break;
      }
      this.queue.paired(code, players, tokens, Date.now());
      await this.persist(); // Save the assignment before either client can join.
      players.forEach((p, i) => this.send(sockets.get(p.id), { type: 'matched', code, token: tokens[i] }));
    }
    await this.persist();
    for (const p of this.queue.queue) this.send(sockets.get(p.id), { type: 'searching', count: this.queue.queue.length });
  }
  private async persist(): Promise<void> {
    await this.ctx.storage.put('queue', { queue: this.queue.queue, pairs: this.queue.pairs });
    if (this.queue.pairs.length) await this.ctx.storage.setAlarm(Math.min(...this.queue.pairs.map(p => p.deadline)));
    else await this.ctx.storage.deleteAlarm();
  }
  private async finish(code: string, started: boolean, tokens: string[]): Promise<void> {
    const pair = this.queue.pairs.find(p => p.code === code); if (!pair) return;
    const sockets = this.sockets();
    if (started) {
      this.queue.complete(code);
      for (const p of pair.players) this.send(sockets.get(p.id), { type: 'ready' });
    } else {
      const connected = new Set(pair.players.filter((_, i) => tokens.includes(pair.tokens[i]!)).map(p => p.id));
      const retry = this.queue.retry(code, connected, new Set(sockets.keys()));
      for (const p of pair.players) this.send(sockets.get(p.id), retry.some(v => v.id === p.id)
        ? { type: 'retry', message: "Opponent didn't connect — still searching" }
        : { type: 'error', error: 'Could not connect to the match. Please try again.' });
    }
  }
  async alarm(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      for (const pair of [...this.queue.pairs]) if (pair.deadline <= Date.now()) {
        const response = await this.env.ROOMS.get(this.env.ROOMS.idFromName(pair.code)).fetch('https://room/expire-pair', { method: 'POST' });
        const result = await response.json<{ started: boolean; tokens: string[]; pendingUntil?: number }>();
        if (result.pendingUntil) { pair.deadline = result.pendingUntil; continue; }
        await this.finish(pair.code, result.started, result.tokens);
      }
      await this.pair();
    });
  }
}
