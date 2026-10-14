import { Group, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { ANIMALS, COLORS, CONFIG, HOME, ROOM, SOLO, SOUND } from '../../../shared/config';
import type { PlayerState, RoomSnapshot } from '../../../shared/room';
import type { HopDirection } from '../../../shared/movement';
import type { GameRenderer } from './renderer';
import type { Preferences } from '../ui/settings';
import type { Motion } from '../ui/motion';
import { Boxer } from './boxer';
import { HopInput } from './input';
import { RoomClient } from './room-client';
import { RailSound } from './rail-sound';

export type RoomScreen = 'lobby' | 'versus' | 'roundEnd' | 'matchEnd' | 'friends' | 'home';
interface Actor { root: Group; boxer: Boxer; animal: number; id: string; heading: number; materials: (MeshStandardMaterial | MeshLambertMaterial)[]; deathAt: number }
const ANGLE: Record<HopDirection, number> = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

export class Versus {
  readonly client = new RoomClient();
  readonly input: HopInput;
  active = false;
  private connecting = false; private phase = ''; private startAt = -1; private eventSequence = 0;
  private poseTime = 0; private arenaRow = NaN;
  private readonly railSound = new RailSound();
  private readonly actors = new Map<string, Actor>();
  private readonly point = new Vector3();
  private readonly scenery = (z: number) => this.game.world.rows.find(slot => slot.z === z)?.row ?? undefined;
  constructor(private readonly root: HTMLElement, readonly game: GameRenderer, private readonly preferences: Preferences,
    private readonly motion: Motion, private readonly show: (screen: RoomScreen) => void) {
    this.input = new HopInput(game.canvas, direction => {
      const before = this.client.prediction.hopStart; this.client.hop(direction);
      if (this.client.prediction.hopStart !== before) this.actors.get(this.client.id)?.boxer.play('hop');
    });
    const priorFrame = game.beforeFrame;
    game.beforeFrame = (now, dt) => { if (this.active) this.frame(dt); else priorFrame?.(now, dt); };
    this.client.onState = state => this.receive(state);
    this.client.onError = error => {
      const text = error === 'ROOM_NOT_FOUND' ? 'Room not found' : error === 'ROOM_FULL' ? 'Room full' : error;
      this.leave('friends'); this.motion.toast(text); this.element('room-error').textContent = text;
    };
    root.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-room], [data-room-animal]') : null;
      if (!button) return;
      game.home.sound.unlock();
      if (button.dataset.roomAnimal !== undefined) this.client.send({ type: 'animal', animal: Number(button.dataset.roomAnimal) });
      else {
        const action = button.dataset.room;
        if (action === 'create' || action === 'join') void this.connect(action === 'create');
        else if (action === 'leave') this.leave();
        else if (action === 'start' || action === 'rematch') this.client.send({ type: 'start' });
        else if (action === 'lobby') this.client.send({ type: 'lobby' });
        else if (action === 'copy') void this.copy();
      }
    });
    document.addEventListener('visibilitychange', () => { if (this.active && !document.hidden) this.client.sync(); });
    window.addEventListener('resize', () => { if (this.active) this.client.sync(); });
  }
  private element(id: string): HTMLElement { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  private async connect(create: boolean): Promise<void> {
    if (this.connecting) return;
    if (!this.preferences.name.trim()) { this.element('room-error').textContent = 'Set your name on Home first.'; return; }
    this.connecting = true; this.element('room-error').textContent = 'Connecting…';
    try {
      const room = create ? await this.client.create() : { code: Array.from(this.root.querySelectorAll<HTMLInputElement>('.room-code input')).map(i => i.value).join('').toUpperCase(), token: '' };
      if (!new RegExp(`^[${ROOM.CODE_ALPHABET}]{${ROOM.CODE_LENGTH}}$`).test(room.code)) throw new Error('Enter the four-letter room code.');
      this.client.connect(room.code, this.preferences.name, this.preferences.animal, room.token);
    } catch (error) { this.element('room-error').textContent = error instanceof Error ? error.message : 'Could not connect.'; }
    finally { this.connecting = false; }
  }
  private async copy(): Promise<void> {
    const url = new URL(location.href); url.search = `?room=${this.client.state!.code}`; url.hash = '';
    try { await navigator.clipboard.writeText(url.href); this.motion.toast('Link copied!'); }
    catch { this.motion.toast(`Room code: ${this.client.state!.code}`); }
  }
  leave(screen: RoomScreen = 'home'): void {
    this.client.close(); this.input.enabled = false; this.input.clear();
    this.active = false; this.phase = ''; this.startAt = -1; this.eventSequence = 0;
    for (const actor of this.actors.values()) this.dispose(actor); this.actors.clear();
    this.game.playing = false; this.game.worldTime = null; this.game.world.actorVisible = true;
    this.game.world.showCrates = true; this.game.rig.resetScroll();
    const arena = this.game.home.arena;
    if (arena) { this.game.home.root.add(arena.root); arena.root.position.set(0, 0, 0); arena.root.rotation.y = 0; arena.restoreHome(); }
    this.game.go('home'); this.element('room-error').textContent = ''; this.show(screen);
  }
  private dispose(actor: Actor): void { actor.root.removeFromParent(); for (const material of actor.materials) material.dispose(); }
  private actor(p: PlayerState): Actor {
    let actor = this.actors.get(p.id);
    if (actor?.animal === p.animal) return actor;
    if (actor) this.dispose(actor);
    const source = this.game.home.animals[p.animal]!;
    const sourceBoxer = this.game.home.boxers[p.animal]!;
    sourceBoxer.review = { move: 'guard', elapsed: 0 }; sourceBoxer.update(0); sourceBoxer.review = null;
    const body = source.clone(true); body.visible = true; body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
    const root = new Group(); root.add(body); this.game.scene.add(root);
    const materials: Actor['materials'] = [];
    body.traverse(node => {
      if (!(node instanceof Mesh) || node.userData.outline) return;
      const original = node.material as MeshStandardMaterial;
      const material = this.game.quality.tier === 'high' ? new MeshStandardMaterial({ vertexColors: true, roughness: original.roughness ?? 1 }) : new MeshLambertMaterial({ vertexColors: true });
      if (node.userData.player_color) material.color.set(COLORS.players[p.slot]!);
      node.material = material; materials.push(material); node.castShadow = this.game.quality.tier !== 'low';
    });
    const boxer = new Boxer(body); boxer.reduced = this.preferences.reducedMotion; boxer.joined();
    actor = { root, boxer, animal: p.animal, id: p.id, heading: 0, materials, deathAt: 0 };
    this.actors.set(p.id, actor); return actor;
  }
  private receive(state: RoomSnapshot): void {
    const first = !this.active;
    this.active = true; this.element('room-error').textContent = '';
    if (first) {
      this.game.world.actorVisible = false; this.game.world.showCrates = false;
      this.game.rig.resetScroll(); this.game.go('gameplay'); this.poseTime = 0;
      const arena = this.game.home.arena;
      if (arena) { this.game.scene.add(arena.root); arena.root.rotation.y = Math.PI; arena.root.position.set(CONFIG.COLUMNS - 1, 0, 0); }
    }
    for (const [id, actor] of this.actors) if (!state.players.some(p => p.id === id && p.connected)) { this.dispose(actor); this.actors.delete(id); }
    for (const p of state.players) if (p.connected) this.actor(p);
    if (this.startAt !== state.startAt) {
      this.startAt = state.startAt; this.game.world.reset(state.seed); this.game.rig.resetScroll(!first);
      this.arenaRow = NaN; this.railSound.reset(); for (const actor of this.actors.values()) actor.boxer.countdown();
    }
    for (const event of state.events) if (event.seq > this.eventSequence) {
      const actor = this.actors.get(event.id);
      if (event.kind === 'hop') actor?.boxer.play('hop');
      if (event.kind === 'shove') { actor?.boxer.play('stunned'); this.actors.get(event.by)?.boxer.play('punch'); }
      if (event.kind === 'death' && actor) { actor.deathAt = this.poseTime; actor.boxer.play('stunned'); this.motion.toast(`${state.players.find(p => p.id === event.id)?.name ?? ''} ${event.cause}`); }
      if (event.kind === 'round') this.actors.get(event.id)?.boxer.play('victory');
      const player = state.players.find(p => p.id === event.id);
      const pan = player ? (player.movement.x - this.client.prediction.x) / SOUND.PAN_TILES : 0;
      const sound = this.game.home.sound;
      if (event.kind === 'hop') sound.play('hop', pan);
      else if (event.kind === 'bonk') sound.play('bonk', pan);
      else if (event.kind === 'shove') sound.play('punch', pan);
      else if (event.kind === 'round' || event.kind === 'forfeit') sound.play('win');
      else if (event.kind === 'death') { sound.play(event.cause === 'SPLASH!' || event.cause === 'SWEPT AWAY!' ? 'splash' : 'squash', pan); if (event.cause === 'DERAILED!') sound.play('horn', pan); }
      this.eventSequence = event.seq;
    }
    const screen: RoomScreen = state.phase === 'lobby' ? 'lobby' : state.phase === 'roundEnd' ? 'roundEnd' : state.phase === 'matchEnd' ? 'matchEnd' : 'versus';
    if (this.phase !== state.phase || first) {
      this.phase = state.phase; this.show(screen);
      if (state.phase === 'playing') for (const actor of this.actors.values()) actor.boxer.countdown(true);
    }
    this.updateUI(state);
  }
  private updateUI(state: RoomSnapshot): void {
    const host = state.host === this.client.id, players = state.players.filter(p => p.connected);
    this.element('lobby-code').textContent = state.code;
    if (state.phase === 'lobby') {
      const list = this.element('lobby-players'); list.replaceChildren();
      for (const p of players) { const line = document.createElement('p'); line.style.borderColor = COLORS.players[p.slot]!;
        line.textContent = `${p.name}${p.id === state.host ? ' ★ HOST' : ''} · ${ANIMALS[p.animal]}`; list.append(line); }
      for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-room-animal]')) {
        const animal = Number(button.dataset.roomAnimal), me = players.find(p => p.id === this.client.id);
        button.disabled = players.some(p => p.id !== this.client.id && p.animal === animal);
        button.setAttribute('aria-pressed', String(me?.animal === animal));
      }
      this.element('lobby-status').textContent = players.length < 2 ? 'Share the code or link with a friend.' : host ? `${players.length} players ready` : 'Waiting for the host to start…';
    }
    for (const action of ['start', 'rematch', 'lobby']) for (const button of this.root.querySelectorAll<HTMLButtonElement>(`[data-room="${action}"]`)) {
      button.disabled = !host || (action !== 'lobby' && players.length < 2);
    }
    this.element('match-host-note').textContent = host ? '' : 'Waiting for the host…';
    this.element('round-label').textContent = `ROUND ${state.round} · FIRST TO 2`;
    for (let slot = 0; slot < CONFIG.MAX_PLAYERS_PRIVATE; slot++) {
      const p = players.find(p => p.slot === slot), card = this.element(`match-player-${slot}`);
      card.hidden = !p;
      if (p) { card.querySelector('strong')!.textContent = `${p.name}${p.id === this.client.id ? ' (YOU)' : ''}`;
        card.querySelector('span')!.textContent = p.waiting ? 'Watching' : `${'♥'.repeat(p.hearts)}${'♡'.repeat(CONFIG.HEARTS_VERSUS - p.hearts)}  ·  ${p.wins} wins`; }
    }
    const winner = state.players.find(p => p.id === state.winner);
    const score = state.players.filter(p => !p.waiting).map(p => `${p.name}: ${p.wins}`).join(' · ');
    this.element('round-result-title').textContent = winner ? `${winner.name} wins!` : 'DRAW!';
    this.element('round-result-score').textContent = score;
    this.element('match-result-title').textContent = winner ? `${winner.name} WINS!` : 'MATCH OVER';
    this.element('match-result-score').textContent = score;
    this.element('match-result-reason').textContent = state.reason.includes('left') ? state.reason : 'Good brawl!';
  }
  private frame(dt: number): void {
    const state = this.client.state; if (!state) return;
    this.poseTime += dt; this.client.advance(); const now = this.client.now;
    const me = state.players.find(p => p.id === this.client.id);
    this.input.enabled = this.client.ready && state.phase === 'playing' && !me?.waiting && (me?.hearts ?? 0) > 0;
    this.game.playing = state.phase === 'playing';
    const time = state.phase === 'playing' ? this.client.time : Math.max(0, (state.now - state.startAt) / 1000);
    this.game.worldTime = time; this.game.rig.targetCamZ = state.camZ; this.game.rig.leaderZ = state.leaderZ;
    if (state.phase === 'playing') this.railSound.update(this.game.world.rows, state.camZ, time, this.game.home.sound);
    const countdown = this.element('match-countdown');
    countdown.textContent = state.phase === 'countdown' ? String(Math.max(1, Math.ceil((state.startAt - now) / 1000)))
      : state.phase === 'playing' && now - state.startAt < SOLO.HOP_BANNER_MS ? 'HOP!' : '';
    const status = this.element('match-status');
    status.textContent = !this.client.ready ? 'Resyncing…' : me?.waiting ? 'Watching — you join next match' : me?.respawnAt ? `Back in ${Math.max(1, Math.ceil((me.respawnAt - now) / 1000))}…` : me?.hearts === 0 ? 'OUT — watching the brawl' : '';
    this.element('round-next').textContent = `Next round in ${Math.max(1, Math.ceil((state.nextAt - now) / 1000))}`;
    const pair = this.client.pair();
    for (const p of state.players) {
      const actor = this.actors.get(p.id); if (!actor) continue;
      const lobby = state.phase === 'lobby';
      let movement = p.id === this.client.id && state.phase === 'playing' && !p.movement.dead ? this.client.prediction : p.movement;
      let x = movement.x, z = movement.z, drawTime = time;
      if (p.id !== this.client.id && pair && state.phase === 'playing') {
        const a = pair.a.players.find(v => v.id === p.id), b = pair.b.players.find(v => v.id === p.id);
        if (a && b) { x = a.movement.x + (b.movement.x - a.movement.x) * pair.mix; z = a.movement.z + (b.movement.z - a.movement.z) * pair.mix;
          movement = pair.mix < 1 ? a.movement : b.movement; drawTime = Math.max(0, (this.client.now - CONFIG.INTERP_DELAY_MS - state.startAt) / 1000); }
      }
      if (lobby) { x = ROOM.SPAWNS[2]![p.slot]!; z = SOLO.SPAWN_Z; }
      const hop = !lobby && movement.hopping ? Math.min(1, Math.max(0, (drawTime - movement.hopStart) * 1000 / CONFIG.HOP_MS)) : 0;
      const y = (movement.onLog ? SOLO.LOG_TOP : 0) + Math.sin(hop * Math.PI) * SOLO.HOP_HEIGHT;
      actor.root.visible = p.connected && !p.waiting && (!p.movement.dead || this.poseTime - actor.deathAt < SOLO.DEATH_MS / 1000);
      actor.root.position.set(x, y, -z);
      const turn = Math.atan2(Math.sin(ANGLE[movement.direction] - actor.heading), Math.cos(ANGLE[movement.direction] - actor.heading));
      actor.heading += turn * Math.min(1, dt * 1000 / SOLO.TURN_MS); actor.root.rotation.y = lobby ? HOME.ANIMAL_YAW : actor.heading;
      const stretch = 1 + Math.sin(hop * Math.PI) * (SOLO.STRETCH_Y - 1); actor.root.scale.set(1 + (1 - stretch) / 2, stretch, 1 + (1 - stretch) / 2);
      if (p.movement.dead) actor.root.scale.y = SOLO.FLATTEN_Y;
      actor.boxer.reduced = this.preferences.reducedMotion; actor.boxer.update(this.poseTime);
      const label = this.element(`match-name-${p.slot}`); label.hidden = !actor.root.visible || lobby;
      label.textContent = `${p.name}${p.id === this.client.id ? ' ▼' : ''}${movement.invulnerableUntil > time ? ' ✦' : ''}`;
      this.point.set(x, SOLO.NAME_HEIGHT, -z).project(this.game.rig.camera);
      label.style.transform = `translate(${(this.point.x + 1) * innerWidth / 2}px,${(1 - this.point.y) * innerHeight / 2}px) translate(-50%,-50%)`;
    }
    if (me) { this.game.world.animalX = this.client.prediction.x; this.game.world.animalZ = this.client.prediction.z; }
    const arena = this.game.home.arena;
    if (arena) {
      arena.root.position.z = -Math.floor(state.camZ / SOLO.ARENA_SPAN) * SOLO.ARENA_SPAN;
      if (this.arenaRow !== Math.floor(state.camZ)) { this.arenaRow = Math.floor(state.camZ); arena.fitGameplay(this.scenery); }
      arena.update(this.poseTime);
    }
  }
}
