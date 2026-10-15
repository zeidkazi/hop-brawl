import { CONFIG } from './config';

export interface SearchPlayer { id: string; name: string; animal: number; joinedAt: number }
export interface Pairing { code: string; players: SearchPlayer[]; tokens: string[]; deadline: number }
/** Serializable FIFO state; transport liveness is supplied by the hibernating DO. */
export class MatchQueue {
  queue: SearchPlayer[] = [];
  pairs: Pairing[] = [];
  add(player: SearchPlayer): void {
    if (!this.queue.some(p => p.id === player.id) && !this.pairs.some(p => p.players.some(v => v.id === player.id))) this.queue.push(player);
  }
  cancel(id: string): void { this.queue = this.queue.filter(p => p.id !== id); }
  candidates(live: ReadonlySet<string>): SearchPlayer[] {
    this.queue = this.queue.filter(p => live.has(p.id)); return this.queue.slice(0, 2);
  }
  paired(code: string, players: SearchPlayer[], tokens: string[], now: number): Pairing {
    this.queue = this.queue.filter(p => !players.some(v => v.id === p.id));
    const pair = { code, players, tokens, deadline: now + CONFIG.QUICK_CONNECT_TIMEOUT_S * 1000 };
    this.pairs.push(pair); return pair;
  }
  complete(code: string): void { this.pairs = this.pairs.filter(p => p.code !== code); }
  retry(code: string, connected: ReadonlySet<string>, live: ReadonlySet<string>): SearchPlayer[] {
    const pair = this.pairs.find(p => p.code === code); if (!pair) return [];
    this.complete(code);
    const players = pair.players.filter(p => connected.has(p.id) && live.has(p.id));
    this.queue = [...players, ...this.queue.filter(p => !players.some(v => v.id === p.id))];
    return players;
  }
}
