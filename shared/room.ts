import { ANIMALS, CONFIG, ROOM, VIEW, scrollSpeed } from './config';
import { gameplayScreenY } from './camera';
import { Movement } from './movement';
import type { HopDirection, MovementState } from './movement';
import { logSlotAtLanding } from './hazards';
import { generateRow } from './worldgen';
import type { Row } from './types';

export type RoomPhase = 'lobby' | 'countdown' | 'playing' | 'freeze' | 'roundEnd' | 'matchEnd';
export interface RoomEvent { seq: number; kind: 'hop' | 'bonk' | 'shove' | 'death' | 'round' | 'forfeit'; id: string; by: string; cause: string; direction: HopDirection }
export interface PlayerState {
  id: string; name: string; animal: number; slot: number; joined: number; connected: boolean; waiting: boolean; aspect: number;
  hearts: number; wins: number; totalDistance: number; reachedAt: number; eliminatedAt: number;
  respawnAt: number; stunUntil: number; proofUntil: number; cooldownUntil: number;
  shoverId: string; shovedAt: number; sequence: number; queued: HopDirection | null; movement: MovementState;
}
type Player = Omit<PlayerState, 'movement'> & { move: Movement };
export interface RoomSnapshot {
  code: string; now: number; phase: RoomPhase; seed: number; camZ: number; leaderZ: number; startAt: number;
  nextAt: number; round: number; winner: string; reason: string; host: string; players: PlayerState[];
  events: RoomEvent[]; eventSequence: number; joinedSequence: number; lastTick: number; decidingAt: number;
}
export function validDirection(value: unknown): value is HopDirection { return value === 'up' || value === 'down' || value === 'left' || value === 'right'; }

/** Pure server authority, also used by room/shove/round tests. No browser or Worker globals. */
export class RoomGame {
  phase: RoomPhase = 'lobby'; seed = 0; camZ = 0; leaderZ = 1; startAt = 0; nextAt = 0; round = 0;
  winner = ''; reason = ''; host = ''; now = 0; lastTick = 0; decidingAt = 0;
  eventSequence = 0; joinedSequence = 0;
  players: Player[] = []; events: RoomEvent[] = [];
  private rows = new Map<number, Row>();
  constructor(readonly code: string, private readonly nextSeed = () => Math.floor(Math.random() * 0x100000000)) {}
  get active(): boolean { return this.phase !== 'lobby' && this.phase !== 'matchEnd'; }
  readonly rowAt = (z: number): Row => {
    let row = this.rows.get(z); if (!row) { row = generateRow(this.seed, z); this.rows.set(z, row); }
    return row;
  };
  private movement(): Movement {
    const move = new Movement(this.rowAt); move.externalCamera = true;
    // A shared death line cannot kill somebody while their device still shows them on screen.
    move.belowScreen = (x, z, cam) => this.players.filter(p => p.connected).every(p => gameplayScreenY(x, z, cam, this.leaderZ, p.aspect) >= 1);
    return move;
  }
  join(id: string, name: string, animal: number, aspect: number, now: number, creator = false): string | null {
    if (this.players.filter(p => p.connected).length >= CONFIG.MAX_PLAYERS_PRIVATE) return 'ROOM_FULL';
    if (!name.trim() || name.length > VIEW.NAME_MAX_LENGTH || !Number.isInteger(animal) || animal < 0 || animal >= ANIMALS.length) return 'BAD_PLAYER';
    const used = this.players.filter(p => p.connected);
    if (used.some(p => p.animal === animal)) animal = ANIMALS.findIndex((_, i) => !used.some(p => p.animal === i));
    const slot = [0, 1, 2, 3].find(i => !used.some(p => p.slot === i))!;
    this.players.push({ id, name: name.trim(), animal, aspect: Math.max(ROOM.MIN_ASPECT, Math.min(ROOM.MAX_ASPECT, aspect || ROOM.DEFAULT_ASPECT)),
      slot, joined: ++this.joinedSequence, connected: true, waiting: this.phase !== 'lobby', hearts: CONFIG.HEARTS_VERSUS,
      wins: 0, totalDistance: 0, reachedAt: now, eliminatedAt: 0, respawnAt: 0, stunUntil: 0, proofUntil: 0,
      cooldownUntil: 0, shoverId: '', shovedAt: -CONFIG.SHOVE_KO_WINDOW_MS, sequence: 0, queued: null, move: this.movement() });
    if (!this.host || creator) this.host = id;
    this.now = now; return null;
  }
  leave(id: string, now: number): void {
    const player = this.players.find(p => p.id === id); if (!player || !player.connected) return;
    player.connected = false; player.hearts = 0; player.queued = null;
    const connected = this.players.filter(p => p.connected);
    if (this.host === id) this.host = connected[0]?.id ?? '';
    if (this.phase === 'lobby') this.players = connected;
    else if (this.phase === 'countdown' && connected.filter(p => !p.waiting).length < 2) this.lobby(this.host, now);
    else if (this.active && connected.filter(p => !p.waiting).length === 1) {
      this.phase = 'matchEnd'; this.winner = connected.find(p => !p.waiting)!.id;
      this.reason = 'Opponent left — you win!'; this.event('forfeit', this.winner);
    }
    this.now = now;
  }
  choose(id: string, animal: number): boolean {
    const player = this.players.find(p => p.id === id && p.connected);
    if (this.phase !== 'lobby' || !player || !Number.isInteger(animal) || animal < 0 || animal >= ANIMALS.length
      || this.players.some(p => p.connected && p.id !== id && p.animal === animal)) return false;
    player.animal = animal; return true;
  }
  lobby(id: string, now: number): boolean {
    if (id !== this.host) return false;
    this.players = this.players.filter(p => p.connected);
    for (const p of this.players) { p.waiting = false; p.move.reset(); }
    this.phase = 'lobby'; this.now = now; this.winner = ''; this.reason = '';
    this.camZ = 0; this.leaderZ = 1; this.startAt = 0; this.nextAt = 0; return true;
  }
  start(id: string, now: number): boolean {
    if (id !== this.host || (this.phase !== 'lobby' && this.phase !== 'matchEnd') || this.players.filter(p => p.connected).length < 2) return false;
    this.players = this.players.filter(p => p.connected);
    for (const p of this.players) { p.waiting = false; p.wins = p.totalDistance = 0; }
    this.round = 1; this.prepareRound(now); return true;
  }
  private prepareRound(now: number): void {
    this.seed = this.nextSeed(); this.rows.clear(); this.camZ = 0; this.leaderZ = 1;
    this.startAt = this.nextAt = now + ROOM.COUNTDOWN_MS; this.lastTick = this.startAt;
    this.decidingAt = 0; this.winner = ''; this.reason = ''; this.phase = 'countdown'; this.now = now;
    const participants = this.players.filter(p => p.connected && !p.waiting);
    participants.forEach((p, index) => {
      p.move.reset(); p.move.x = p.move.fromX = p.move.toX = ROOM.SPAWNS[participants.length - 2]![index]!;
      p.hearts = CONFIG.HEARTS_VERSUS; p.respawnAt = p.stunUntil = p.proofUntil = p.cooldownUntil = p.eliminatedAt = 0;
      p.shovedAt = -CONFIG.SHOVE_KO_WINDOW_MS; p.shoverId = ''; p.reachedAt = now; p.queued = null;
    });
  }
  hop(id: string, direction: HopDirection, sequence: number, now: number): boolean {
    this.tick(now);
    const p = this.players.find(p => p.id === id && p.connected);
    if (!p || !Number.isSafeInteger(sequence) || sequence <= p.sequence) return false;
    p.sequence = sequence;
    if (this.phase !== 'playing' || p.waiting || p.hearts <= 0 || p.move.dead || now < p.stunUntil) return false;
    if (p.move.hopping) { p.queued ??= direction; return false; }
    return this.performHop(p, direction, now);
  }
  private occupied(x: number, z: number, except: Player): Player | undefined {
    return this.players.find(p => p !== except && p.connected && !p.waiting && p.hearts > 0 && !p.move.dead
      && ((Math.round(p.move.x) === Math.round(x) && Math.round(p.move.z) === Math.round(z))
        || (p.move.hopping && Math.round(p.move.toX) === Math.round(x) && p.move.toZ === z)));
  }
  private performHop(p: Player, dir: HopDirection, now: number): boolean {
    const before = p.move.save();
    if (!p.move.input(dir)) { this.event('bonk', p.id); return false; }
    const victim = this.occupied(p.move.toX, p.move.toZ, p);
    if (!victim) { this.event('hop', p.id, '', '', dir); return true; }
    p.move.restore(before);
    if (now < p.cooldownUntil || now < victim.proofUntil || victim.move.hopping || now < victim.stunUntil
      || p.move.time < p.move.invulnerableUntil || victim.move.time < victim.move.invulnerableUntil) { this.event('bonk', p.id); return false; }
    const victimBefore = victim.move.save();
    if (!victim.move.input(dir) || this.occupied(victim.move.toX, victim.move.toZ, victim)) {
      victim.move.restore(victimBefore); this.event('bonk', p.id); return false;
    }
    p.cooldownUntil = now + CONFIG.SHOVE_COOLDOWN_MS;
    victim.stunUntil = now + CONFIG.SHOVE_STUN_MS; victim.proofUntil = victim.stunUntil + CONFIG.SHOVE_PROOF_MS;
    victim.queued = null; victim.shoverId = p.id; victim.shovedAt = now;
    this.event('shove', victim.id, p.id, '', dir); return true;
  }
  private event(kind: RoomEvent['kind'], id: string, by = '', cause = '', direction: HopDirection = 'up'): void {
    this.events.push({ seq: ++this.eventSequence, kind, id, by, cause, direction });
    if (this.events.length > ROOM.MAX_EVENTS) this.events.shift();
  }
  private respawn(p: Player, now: number): void {
    const time = (now - this.startAt) / 1000, savedDistance = p.move.distance;
    const slot = { log: -1, slot: -1, x: 0 };
    for (let z = Math.ceil(this.camZ) + ROOM.RESPAWN_ROW_OFFSET; z < Math.ceil(this.camZ) + ROOM.RESPAWN_LOOKAHEAD; z++) {
      const row = this.rowAt(z);
      for (let offset = 0; offset < CONFIG.COLUMNS; offset++) {
        const column = 4 + Math.ceil(offset / 2) * (offset % 2 ? -1 : 1);
        if (column < 0 || column >= CONFIG.COLUMNS || row.kind === 'grass' && row.obstacles.some(o => o.column === column)) continue;
        let x = column;
        if (row.kind === 'river') { logSlotAtLanding(row, column, time, slot); if (slot.log < 0 || slot.x < 0 || slot.x > 8) continue; x = slot.x; }
        if (this.occupied(x, z, p)) continue;
        p.move.reset(); p.move.x = p.move.fromX = p.move.toX = x; p.move.z = p.move.fromZ = p.move.toZ = z;
        p.move.time = time; p.move.distance = savedDistance; p.move.camZ = this.camZ;
        p.move.invulnerableUntil = time + CONFIG.SPAWN_PROTECT_MS / 1000;
        if (row.kind === 'river') { p.move.onLog = true; p.move.logIndex = slot.log; p.move.slotIndex = slot.slot; }
        p.respawnAt = 0; p.queued = null; return;
      }
    }
    p.respawnAt = now + ROOM.SNAPSHOT_MS;
  }
  tick(now: number): void {
    this.now = now;
    if (this.phase === 'countdown' && now >= this.nextAt) this.phase = 'playing';
    if (this.phase === 'freeze' && now >= this.nextAt) { this.phase = 'roundEnd'; this.nextAt = now + ROOM.ROUND_END_MS; }
    if (this.phase === 'roundEnd' && now >= this.nextAt) {
      const won = this.players.find(p => p.wins >= CONFIG.ROUNDS_TO_WIN);
      if (won || this.round >= ROOM.MAX_ROUNDS && this.winner) {
        const ranked = this.players.filter(p => p.connected && !p.waiting).sort((a, b) => b.wins - a.wins || b.totalDistance - a.totalDistance || a.joined - b.joined);
        this.winner = won?.id ?? ranked[0]?.id ?? ''; this.phase = 'matchEnd';
      } else { if (this.winner) this.round++; this.prepareRound(now); }
    }
    if (this.phase !== 'playing') return;
    const time = Math.max(0, (now - this.startAt) / 1000), dt = Math.max(0, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const alive = this.players.filter(p => p.connected && !p.waiting && p.hearts > 0);
    const leader = Math.max(1, ...alive.map(p => p.move.z)); this.leaderZ = Math.max(this.leaderZ, leader);
    this.camZ = Math.max(this.camZ + scrollSpeed(time) * dt, Math.min(leader - CONFIG.LEADER_MAX_AHEAD_ROWS, this.camZ + CONFIG.CAMERA_MAX_SPEED * dt));
    for (const p of alive) {
      if (p.respawnAt) { if (now >= p.respawnAt) this.respawn(p, now); continue; }
      p.move.camZ = this.camZ; const distance = p.move.distance; p.move.advance(time);
      if (p.move.distance > distance) p.reachedAt = now;
      if (p.move.dead) {
        p.hearts--; p.queued = null;
        if (p.hearts) p.respawnAt = now + CONFIG.RESPAWN_DELAY_MS;
        else { p.eliminatedAt = now; this.decidingAt = now + CONFIG.TIE_WINDOW_MS; }
        const by = now - p.shovedAt <= CONFIG.SHOVE_KO_WINDOW_MS ? p.shoverId : '';
        this.event('death', p.id, by, p.move.dead);
      } else if (!p.move.hopping && p.queued && now >= p.stunUntil) {
        const dir = p.queued; p.queued = null; this.performHop(p, dir, now);
      }
    }
    const remaining = this.players.filter(p => p.connected && !p.waiting && p.hearts > 0);
    if (time >= CONFIG.ROUND_CAP_S) {
      const ranked = [...remaining].sort((a, b) => b.move.distance - a.move.distance || b.hearts - a.hearts || a.reachedAt - b.reachedAt);
      const a = ranked[0], b = ranked[1]; this.finishRound(a && (!b || a.move.distance !== b.move.distance || a.hearts !== b.hearts || a.reachedAt !== b.reachedAt) ? a.id : '', now);
    } else if (remaining.length <= 1 && this.decidingAt && now >= this.decidingAt) {
      if (remaining.length) this.finishRound(remaining[0]!.id, now);
      else {
        const latest = Math.max(...this.players.map(p => p.eliminatedAt));
        const ranked = this.players.filter(p => !p.waiting && latest - p.eliminatedAt <= CONFIG.TIE_WINDOW_MS).sort((a, b) => b.move.distance - a.move.distance);
        this.finishRound(ranked[0] && (!ranked[1] || ranked[0].move.distance > ranked[1].move.distance) ? ranked[0].id : '', now);
      }
    }
    for (const z of this.rows.keys()) if (z < Math.floor(this.camZ) - VIEW.POOL_ROWS) this.rows.delete(z);
  }
  private finishRound(winner: string, now: number): void {
    this.winner = winner; this.reason = winner ? 'Round won!' : 'DRAW — replaying round';
    for (const p of this.players) { p.totalDistance += p.move.distance; if (p.id === winner) p.wins++; }
    this.phase = 'freeze'; this.nextAt = now + ROOM.FREEZE_MS; this.event('round', winner);
  }
  snapshot(): RoomSnapshot {
    return { code: this.code, now: this.now, phase: this.phase, seed: this.seed, camZ: this.camZ, leaderZ: this.leaderZ,
      startAt: this.startAt, nextAt: this.nextAt, round: this.round, winner: this.winner, reason: this.reason, host: this.host,
      eventSequence: this.eventSequence, joinedSequence: this.joinedSequence, lastTick: this.lastTick, decidingAt: this.decidingAt,
      events: this.events, players: this.players.map(({ move, ...p }) => ({ ...p, movement: move.save() })) };
  }
  restore(state: RoomSnapshot): void {
    const { players, code: _code, ...rest } = state; Object.assign(this, rest); this.rows.clear();
    this.players = players.map(({ movement, ...p }) => { const move = this.movement(); move.restore(movement); return { ...p, move }; });
  }
}

