import { CONFIG, ROOM } from '../../../shared/config';
import type { Versus } from '../game/versus';
import type { Motion } from './motion';
import type { Preferences } from './settings';

export const SEARCH_MARKUP = `<section id="search" class="screen modal" aria-label="Quick Match search" hidden>
  <div class="panel" id="search-main"><div class="search-crate" aria-hidden="true">✦</div><h2>Finding an opponent…</h2>
    <p><time id="search-time">00:00</time> · <span id="search-count" role="status">Connecting…</span></p>
    <button data-quick="cancel">Cancel</button></div>
  <div class="panel" id="search-empty" role="dialog" aria-modal="true" aria-labelledby="search-empty-title" hidden>
    <h2 id="search-empty-title">Nobody's around right now</h2>
    <button class="yellow" data-quick="keep">Keep searching</button><button class="blue" data-quick="solo">Play Solo</button>
    <button class="green" data-quick="invite">Invite a friend</button></div>
</section>`;

export class QuickMatch {
  private socket: WebSocket | null = null;
  private timer = 0; private started = 0; private promptAt = 0; private lastMessage = 0; private lastPing = 0;
  private matched = false;
  constructor(private root: HTMLElement, private versus: Versus, private preferences: Preferences, private motion: Motion,
    private show: (screen: 'search' | 'friends' | 'home' | 'solo') => void) {
    root.addEventListener('click', event => {
      const action = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-quick]')?.dataset.quick : undefined;
      if (!action) return;
      if (action === 'start' || action === 'new') this.start();
      else if (action === 'keep') { this.promptAt = Date.now() + CONFIG.QUICK_PROMPT_S * 1000; this.prompt(false); }
      else {
        this.stop(); if (this.versus.active) this.versus.leave(action === 'menu' ? 'home' : 'friends');
        this.show(action === 'solo' ? 'solo' : action === 'menu' ? 'home' : 'friends');
        if (action === 'invite') void this.versus.connect(true);
      }
    });
    versus.onQuickConnectionError = () => {
      if (!this.socket) return false;
      this.versus.leave('search'); return true; // Matchmaker decides retry/error, including socket-close races.
    };
    window.addEventListener('pagehide', () => this.stop());
  }
  private el(id: string): HTMLElement { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  private prompt(show: boolean): void {
    this.el('search-empty').hidden = !show; this.el('search-main').hidden = show;
    if (show) this.el('search-empty').querySelector<HTMLButtonElement>('button')?.focus();
  }
  start(): void {
    this.stop(); if (this.versus.active) this.versus.leave('search'); else this.show('search');
    this.started = Date.now(); this.promptAt = this.started + CONFIG.QUICK_PROMPT_S * 1000;
    this.lastMessage = this.lastPing = this.started; this.matched = false; this.prompt(false);
    this.el('search').dataset.reduced = String(this.preferences.reducedMotion);
    this.el('search-count').textContent = 'Connecting…'; this.el('search-time').textContent = '00:00';
    const url = new URL('/ws/quick', this.versus.client.base); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = new URLSearchParams({ name: this.preferences.name, animal: String(this.preferences.animal) }).toString();
    const ws = this.socket = new WebSocket(url);
    ws.onmessage = event => {
      if (this.socket !== ws) return;
      this.lastMessage = Date.now(); if (event.data === 'pong') return;
      const message = JSON.parse(String(event.data)) as { type: string; count: number; code: string; token: string; message: string; error: string };
      if (message.type === 'searching') this.el('search-count').textContent = `${message.count} searching`;
      else if (message.type === 'matched') {
        this.matched = true; this.prompt(false); this.el('search-count').textContent = 'Opponent found! Connecting…';
        this.versus.client.connect(message.code, this.preferences.name, this.preferences.animal, message.token);
      } else if (message.type === 'retry') {
        this.versus.leave('search'); this.matched = false; this.started = Date.now(); this.promptAt = this.started + CONFIG.QUICK_PROMPT_S * 1000;
        this.prompt(false); this.motion.toast(message.message);
      } else if (message.type === 'ready') this.stop();
      else if (message.type === 'error') this.fail(message.error);
    };
    ws.onclose = () => { if (this.socket === ws) this.fail('Search disconnected. Please try again.'); };
    ws.onerror = () => { if (this.socket === ws) this.fail('Cannot reach matchmaking. Please try again.'); };
    this.timer = window.setInterval(() => {
      const now = Date.now(), elapsed = Math.floor((now - this.started) / 1000);
      this.el('search-time').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
      if (!this.matched && now >= this.promptAt && this.el('search-empty').hidden) this.prompt(true);
      if (now - this.lastMessage > ROOM.PING_MS * 2) { this.fail('Search disconnected. Please try again.'); return; }
      if (now - this.lastPing >= ROOM.PING_MS && ws.readyState === WebSocket.OPEN) { ws.send('ping'); this.lastPing = now; }
    }, 1000);
  }
  private fail(message: string): void {
    this.stop(); this.versus.leave('friends'); this.el('room-error').textContent = message; this.motion.toast(message);
  }
  stop(): void {
    const ws = this.socket; this.socket = null; clearInterval(this.timer);
    if (ws?.readyState === WebSocket.OPEN) ws.send('cancel'); ws?.close(1000, 'Left search');
  }
}
