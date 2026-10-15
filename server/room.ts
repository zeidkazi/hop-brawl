import { DurableObject } from 'cloudflare:workers';
import { CONFIG, ROOM } from '../shared/config';
import { RoomGame, validDirection } from '../shared/room';
import type { RoomSnapshot } from '../shared/room';
import type { Env } from './index';

interface Assignment { id: string; name: string; animal: number; token: string; roomId?: string }
interface Saved { assignments?: Assignment[]; pairDeadline?: number; pairFinished?: boolean; snapshot: RoomSnapshot; token: string; emptyAt: number }
interface Attachment { id: string; window: number; count: number }

/** Lobby sockets hibernate; a live match alone owns a 20 Hz simulation timer. */
export class Room extends DurableObject<Env> {
  private game: RoomGame | null = null;
  private assignments: Assignment[] = []; private pairDeadline = 0; private pairFinished = false;
  private token = ''; private emptyAt = 0; private savedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('room');
      if (saved) {
        this.game = new RoomGame(saved.snapshot.code); this.game.restore(saved.snapshot);
        this.assignments = saved.assignments ?? []; this.pairDeadline = saved.pairDeadline ?? 0; this.pairFinished = saved.pairFinished ?? false;
        this.token = saved.token; this.emptyAt = saved.emptyAt;
        // Socket attachments survive hibernation and are the connection authority.
        const live = new Set(ctx.getWebSockets().map(ws => (ws.deserializeAttachment() as Attachment).id));
        for (const p of this.game.players) if (p.connected && !live.has(p.id)) this.game.leave(p.id, Date.now());
        this.manageTimer();
      }
    });
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url), now = Date.now();
    if (url.pathname === '/create') {
      if (this.game) return new Response('Exists', { status: 409 });
      const body = await request.json<{ code: string; token: string; assignments?: Assignment[] }>();
      this.assignments = body.assignments ?? []; this.pairDeadline = now + CONFIG.QUICK_CONNECT_TIMEOUT_S * 1000;
      this.game = new RoomGame(body.code); this.game.quick = this.assignments.length === 2; this.token = body.token; this.emptyAt = now;
      await this.save(); await this.ctx.storage.setAlarm(now + CONFIG.ROOM_EXPIRE_MIN * 60000);
      return new Response('Created', { status: 201 });
    }
    if (url.pathname === '/expire-pair') {
      const started = Boolean(this.game?.quick && this.game.round > 0 && this.game.phase !== 'lobby' && this.game.phase !== 'countdown');
      const tokens = this.connectedTokens();
      if (!started) { this.pairDeadline = 0; this.pairFinished = true; for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Pair expired'); }
      await this.save(); return Response.json({ started, tokens });
    }
    const assignment = this.assignments.find(a => a.token === url.searchParams.get('token') && !a.roomId);
    const denied = this.game?.quick && (!assignment || this.pairFinished || now >= this.pairDeadline);
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    const id = crypto.randomUUID();
    const error = denied ? 'ROOM_NOT_FOUND' : this.game?.join(id, assignment?.name ?? url.searchParams.get('name') ?? '', assignment?.animal ?? Number(url.searchParams.get('animal')),
      Number(url.searchParams.get('aspect')), now, Boolean(this.token && url.searchParams.get('token') === this.token)) ?? (this.game ? null : 'ROOM_NOT_FOUND');
    this.ctx.acceptWebSocket(server, [id]); server.serializeAttachment({ id, window: now, count: 0 } satisfies Attachment);
    if (error) { server.send(JSON.stringify({ type: 'error', error })); server.close(1008, error); }
    else {
      if (assignment) assignment.roomId = id;
      if (url.searchParams.get('token') === this.token) this.token = '';
      this.emptyAt = 0; server.send(JSON.stringify({ type: 'welcome', id, snapshot: this.game!.snapshot() }));
      this.broadcast(); await this.save(); this.manageTimer();
      await this.ctx.storage.setAlarm(now + CONFIG.LOBBY_IDLE_CLOSE_MIN * 60000);
    }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.game || typeof message !== 'string' || message.length > ROOM.MAX_MESSAGE_BYTES) { ws.close(1008, 'Invalid message'); return; }
    const a = ws.deserializeAttachment() as Attachment, now = Date.now();
    if (now - a.window >= 1000) { a.window = now; a.count = 0; }
    if (++a.count > CONFIG.RATE_LIMIT_MSGS_S) { ws.close(1008, 'Too many messages'); return; }
    ws.serializeAttachment(a);
    let body: Record<string, unknown>;
    try { body = JSON.parse(message) as Record<string, unknown>; if (!body || typeof body !== 'object') return; } catch { return; }
    if (body.type === 'clock') {
      ws.send(JSON.stringify({ type: 'clock', sent: body.sent, now })); return;
    }
    if (body.type === 'sync') {
      if (typeof body.aspect === 'number' && Number.isFinite(body.aspect)) {
        const p = this.game.players.find(p => p.id === a.id);
        if (p) p.aspect = Math.min(ROOM.MAX_ASPECT, Math.max(ROOM.MIN_ASPECT, body.aspect));
      }
      this.game.tick(now); ws.send(JSON.stringify({ type: 'state', snapshot: this.game.snapshot() })); return;
    }
    if (body.type === 'hop' && validDirection(body.direction) && typeof body.sequence === 'number') this.game.hop(a.id, body.direction, body.sequence, now);
    else if (body.type === 'death' && Number.isSafeInteger(body.lifeId)) this.game.reportDeath(a.id, body.lifeId as number, now);
    else if (body.type === 'animal' && typeof body.animal === 'number') this.game.choose(a.id, body.animal);
    else if (body.type === 'rematch') this.game.rematch(a.id, now);
    else if (body.type === 'start') this.game.start(a.id, now);
    else if (body.type === 'lobby' && this.game.phase === 'matchEnd') this.game.lobby(a.id, now);
    else return;
    this.game.now = now; this.broadcast(); this.manageTimer();
    if (body.type !== 'hop') await this.save();
  }
  async webSocketClose(ws: WebSocket): Promise<void> { await this.disconnected(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.disconnected(ws); }
  private async disconnected(ws: WebSocket): Promise<void> {
    const a = ws.deserializeAttachment() as Attachment | null;
    if (!a || !this.game || !this.game.players.some(p => p.id === a.id && p.connected)) return;
    this.game.leave(a.id, Date.now());
    try { ws.close(1000, 'Left room'); } catch { /* Already closed. */ }
    if (this.game.quick && !this.pairFinished && this.game.phase === 'lobby') this.finishPair(false);
    this.broadcast(); this.manageTimer();
    if (!this.game.players.some(p => p.connected)) {
      this.emptyAt = Date.now(); await this.ctx.storage.setAlarm(this.emptyAt + CONFIG.ROOM_EXPIRE_MIN * 60000);
    }
    await this.save();
  }
  private connectedTokens(): string[] {
    return this.assignments.filter(a => this.game?.players.some(p => p.id === a.roomId && p.connected)).map(a => a.token);
  }
  private finishPair(started: boolean): void {
    this.pairFinished = true;
    const tokens = this.connectedTokens();
    this.ctx.waitUntil(this.env.MATCHMAKER.get(this.env.MATCHMAKER.idFromName('global')).fetch('https://matchmaker/finished', {
      method: 'POST', body: JSON.stringify({ code: this.game!.code, started, tokens }),
    }));
  }
  private broadcast(): void {
    const message = JSON.stringify({ type: 'state', snapshot: this.game!.snapshot() });
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(message); } catch { /* Close callback removes player. */ } }
  }
  private manageTimer(): void {
    const live = this.game?.active && this.game.players.some(p => p.connected);
    if (live && !this.timer) this.timer = setInterval(() => {
      this.game!.tick(Date.now());
      if (this.game!.quick && !this.pairFinished && this.game!.phase === 'playing') this.finishPair(true);
      this.broadcast(); this.manageTimer();
      if (Date.now() - this.savedAt >= ROOM.SAVE_MS || !this.game!.active) this.ctx.waitUntil(this.save());
    }, ROOM.SNAPSHOT_MS);
    else if (!live && this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  private async save(): Promise<void> {
    if (!this.game) return; this.savedAt = Date.now();
    await this.ctx.storage.put('room', { assignments: this.assignments, pairDeadline: this.pairDeadline, pairFinished: this.pairFinished, snapshot: this.game.snapshot(), token: this.token, emptyAt: this.emptyAt } satisfies Saved);
  }
  async alarm(): Promise<void> {
    if (this.emptyAt && Date.now() - this.emptyAt >= CONFIG.ROOM_EXPIRE_MIN * 60000) {
      if (this.timer) clearInterval(this.timer); this.timer = null; this.game = null; await this.ctx.storage.deleteAll(); return;
    }
    if (this.game?.active) { this.game.tick(Date.now()); this.manageTimer(); return; }
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room expired');
  }
}
