import { BackSide, Group, Material, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { ANIMALS, BIOME_PALETTES, BOXER, COLORS, CONFIG, HOME, RAIL, ROOM, SOLO, SOUND, WORLD } from '../../../shared/config';
import type { PlayerState, RoomSnapshot } from '../../../shared/room';
import type { DeathCause, HopDirection } from '../../../shared/movement';
import type { GameRenderer } from './renderer';
import type { Preferences } from '../ui/settings';
import type { Motion } from '../ui/motion';
import { BoxingEffects } from './boxing-feedback';
import { Boxer } from './boxer';
import { HopInput } from './input';
import { RoomClient } from './room-client';
import { animalIcon, heartIcons, winPips } from '../ui/room-icons';
import { lobbyControls, remoteMovement, roomWorldTime } from './room-presentation';
import { LifeEvents } from './life-events';
import { WorldSound } from './world-sound';
import { createHopPose, sampleHop } from '../../../shared/hop';
import { createDeathPose, deathPose, Facing, respawnHeight } from './fighter-pose';
import { DeathEffects } from './death-effects';
import { trainX } from '../../../shared/hazards';

export type RoomScreen = 'search' | 'lobby' | 'versus' | 'roundEnd' | 'matchEnd' | 'friends' | 'home';
interface Actor { effects: BoxingEffects; root: Group; boxer: Boxer; animal: number; id: string; heading: number; facing: Facing; materials: Material[]; deathAt: number; deathCause: DeathCause | null; deathX: number; deathZ: number; deathEffects: DeathEffects; lifeId: number; respawnAt: number; landedHop: number; hopReview: { move: 'hop'; elapsed: number } }
const ANGLE: Record<HopDirection, number> = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

export class Versus {
  readonly client = new RoomClient();
  readonly input: HopInput;
  active = false;
  onQuickConnectionError: (() => boolean) | null = null;
  private lastCountdown = '';
  private connecting = false; private phase = ''; private startAt = -1; private eventSequence = 0;
  private poseTime = 0; private arenaRow = NaN;
  private readonly deaths = new LifeEvents();
  private readonly railSound = new WorldSound();
  private readonly actors = new Map<string, Actor>();
  private readonly point = new Vector3();
  private readonly hopPose = createHopPose(); private readonly deathPose = createDeathPose();
  private readonly scenery = (z: number) => this.game.world.rows.find(slot => slot.z === z)?.row ?? undefined;
  constructor(private readonly root: HTMLElement, readonly game: GameRenderer, private readonly preferences: Preferences,
    private readonly motion: Motion, private readonly show: (screen: RoomScreen) => void) {
    this.input = new HopInput(game.canvas, direction => {
      const before = this.client.prediction.hopStart; this.client.hop(direction);
      if (this.client.prediction.hopStart !== before) this.actors.get(this.client.id)?.boxer.play('hop');
    });
    const priorFrame = game.beforeFrame;
    game.beforeFrame = (now, dt) => { if (this.active) this.frame(dt); else priorFrame?.(now, dt); };
    this.client.onPredictedDeath = (lifeId, cause) => this.animateDeath(this.client.id, lifeId, cause);
    this.client.onState = state => this.receive(state);
    this.client.onError = error => {
      if (this.onQuickConnectionError?.()) return;
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
        else if (action === 'start' || action === 'rematch') this.client.send({ type: action === 'rematch' && this.client.state?.quick ? 'rematch' : 'start' });
        else if (action === 'lobby') this.client.send({ type: 'lobby' });
        else if (action === 'copy') void this.copy();
      }
    });
    document.addEventListener('visibilitychange', () => { if (this.active && !document.hidden) this.client.sync(); });
    window.addEventListener('pageshow', () => { if (this.active && !document.hidden) this.client.sync(); });
    window.addEventListener('resize', () => { if (this.active) this.client.sync(); });
  }
  private element(id: string): HTMLElement { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  async connect(create: boolean): Promise<void> {
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
    this.deaths.clear(); this.motion.clearToasts(); this.active = false; this.phase = ''; this.startAt = -1; this.eventSequence = 0;
    for (const actor of this.actors.values()) this.dispose(actor); this.actors.clear();
    this.game.playing = false; this.game.worldTime = null; this.game.world.actorVisible = true;
    this.game.world.showCrates = true; this.game.rig.resetScroll();
    const arena = this.game.home.arena;
    if (arena) { this.game.home.root.add(arena.root); arena.root.position.set(0, 0, 0); arena.root.rotation.y = 0; arena.restoreHome(); }
    this.game.go('home'); this.element('room-error').textContent = ''; this.show(screen);
  }
  private dispose(actor: Actor): void { actor.root.removeFromParent(); actor.effects.dispose(); actor.deathEffects.dispose(); for (const material of actor.materials) material.dispose(); }
  private actor(p: PlayerState): Actor {
    let actor = this.actors.get(p.id);
    if (actor?.animal === p.animal) return actor;
    if (actor) this.dispose(actor);
    const source = this.game.home.animals[p.animal]!;
    const sourceBoxer = this.game.home.boxers[p.animal]!;
    sourceBoxer.review = { move: 'guard', elapsed: 0 }; sourceBoxer.update(0); sourceBoxer.review = null;
    const body = source.clone(true); body.visible = true; body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
    const root = new Group(); root.name = `room-player-${p.id}`; root.add(body); this.game.scene.add(root);
    const materials: Actor['materials'] = [];
    body.traverse(node => {
      if (!(node instanceof Mesh)) return;
      if (node.userData.outline) { const material = (node.material as Material).clone(); material.transparent = true; material.transparent = true; node.material = material; materials.push(material); return; }
      const original = node.material as MeshStandardMaterial;
      const material = this.game.quality.tier === 'high' ? new MeshStandardMaterial({ vertexColors: true, roughness: original.roughness ?? 1 }) : new MeshLambertMaterial({ vertexColors: true });
      if (node.userData.player_color) material.color.set(COLORS.players[p.slot]!);
      else if (this.client.state?.quick && p.slot === 1 && this.client.state.players.some(other => other.slot === 0 && other.animal === p.animal)) material.color.set(COLORS.yellow);
      material.transparent = true; node.material = material; materials.push(material); node.castShadow = this.game.quality.tier !== 'low';
    });
    const boxer = new Boxer(body); boxer.reduced = this.preferences.reducedMotion; boxer.joined();
    const effects = new BoxingEffects(BOXER.SHOVE_EFFECT_SCALE); this.game.scene.add(effects.root);
    boxer.onCue = cue => {
      if (cue !== 'hit') return;
      const glove = boxer.punchSide < 0 ? boxer.left : boxer.right;
      glove.getWorldPosition(this.point); effects.contact(this.poseTime, this.point);
    };
    const deathEffects = new DeathEffects(); this.game.scene.add(deathEffects.root);
    actor = { effects, root, boxer, animal: p.animal, id: p.id, heading: 0, facing: new Facing(), materials, deathAt: -Infinity,
      deathCause: null, deathX: 0, deathZ: 0, deathEffects, lifeId: p.lifeId, respawnAt: -Infinity, landedHop: -1, hopReview: { move: 'hop', elapsed: 0 } };
    this.actors.set(p.id, actor); return actor;
  }
  private receive(state: RoomSnapshot): void {
    if (state.quick && state.phase === 'lobby') return;
    const first = !this.active;
    if (first) this.eventSequence = state.eventSequence;
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
      this.motion.clearToasts(); this.eventSequence = state.eventSequence;
      this.startAt = state.startAt; this.game.world.reset(state.seed); this.game.rig.resetScroll(!first);
      this.arenaRow = NaN; this.railSound.reset(); this.lastCountdown = ''; this.game.home.sound.resetRound(); for (const actor of this.actors.values()) actor.boxer.countdown();
    }
    for (const p of state.players) {
      const actor = this.actors.get(p.id); if (!actor || actor.lifeId === p.lifeId) continue;
      actor.lifeId = p.lifeId; actor.deathCause = null; actor.deathAt = -Infinity; actor.landedHop = -1;
      actor.respawnAt = state.phase === 'playing' ? this.poseTime : -Infinity;
      if (state.phase === 'playing') this.game.home.sound.play('respawn', (p.movement.x - this.client.prediction.x) / SOUND.PAN_TILES); actor.facing.reset();
      for (const material of actor.materials) material.opacity = 1;
    }
    for (const event of state.events) if (event.seq > this.eventSequence) {
      const actor = this.actors.get(event.id);
      if (event.kind === 'hop') actor?.boxer.play('hop');
      if (event.kind === 'shove') { actor?.boxer.play('stunned'); this.actors.get(event.by)?.boxer.play('punch'); }
      if (event.kind === 'death') {
        this.animateDeath(event.id, event.lifeId, event.cause as DeathCause);
        if (!this.deaths.confirmation(event.id, event.lifeId)) { this.eventSequence = event.seq; continue; }
        this.motion.toast(`${state.players.find(p => p.id === event.id)?.name ?? ''} ${event.cause}`);
      }
      if (event.kind === 'round') this.actors.get(event.id)?.boxer.play('victory');
      const player = state.players.find(p => p.id === event.id);
      const pan = player ? (player.movement.x - this.client.prediction.x) / SOUND.PAN_TILES : 0;
      const sound = this.game.home.sound;
      if (event.kind === 'hop') sound.play('hop', pan, undefined, player?.animal);
      else if (event.kind === 'bonk') sound.play('bonk', pan);
      else if (event.kind === 'shove') { sound.play('punch', pan); sound.play(`grunt${player?.animal ?? 2}` as 'grunt2', pan); }
      else if (event.kind === 'round') sound.sting('roundWin');
      else if (event.kind === 'death') { sound.death(event.cause as DeathCause, pan); if (event.by || player?.hearts === 0) sound.play('cheer', pan); }
      this.eventSequence = event.seq;
    }
    const screen: RoomScreen = state.phase === 'lobby' ? 'lobby' : state.phase === 'roundEnd' ? 'roundEnd' : state.phase === 'matchEnd' ? 'matchEnd' : 'versus';
    if (this.phase !== state.phase || first) {
      this.phase = state.phase; this.show(screen);
      if (state.phase === 'playing') {
        for (const actor of this.actors.values()) actor.boxer.countdown(true);
        this.game.home.sound.gameplay('meadow', state.round >= 3); this.game.home.sound.play('go');
      } else {
        this.game.home.sound.stopWorld();
        if (state.phase === 'lobby') this.game.home.sound.menu();
        if (state.phase === 'matchEnd') this.game.home.sound.sting('matchWin');
      }
    }
    if (state.phase === 'playing') this.game.home.sound.muffle(state.players.find(p => p.id === this.client.id)?.hearts === 0);
    this.updateUI(state);
  }
  private animateDeath(id: string, lifeId: number, cause: DeathCause): void {
    const actor = this.actors.get(id);
    if (actor && this.deaths.animation(id, lifeId)) {
      const move = id === this.client.id ? this.client.prediction : this.client.state!.players.find(p => p.id === id)!.movement;
      actor.deathAt = this.poseTime; actor.deathCause = cause; actor.deathX = move.x; actor.deathZ = move.z;
      actor.boxer.play('stunned');
      if (cause === 'SPLASH!' || cause === 'LEFT BEHIND!') this.game.particles.burst(move.x, move.z, cause === 'SPLASH!' ? COLORS.water : COLORS.cream);
    }
  }
  private updateUI(state: RoomSnapshot): void {
    const host = state.host === this.client.id, players = state.players.filter(p => p.connected);
    this.element('lobby-code').textContent = state.code;
    if (state.phase === 'lobby') {
      const list = this.element('lobby-players'); list.replaceChildren();
      for (const p of players) { const line = document.createElement('p'); line.style.borderColor = COLORS.players[p.slot]!;
        line.textContent = `${p.name}${p.id === state.host ? ' ★ HOST' : ''} · ${ANIMALS[p.animal]!.replace(/^./, c => c.toUpperCase())}`; list.append(line); }
      for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-room-animal]')) {
        const animal = Number(button.dataset.roomAnimal), me = players.find(p => p.id === this.client.id);
        button.disabled = players.some(p => p.id !== this.client.id && p.animal === animal);
        button.setAttribute('aria-pressed', String(me?.animal === animal));
      }
      this.element('lobby-status').textContent = lobbyControls(state, this.client.id).status;
    }
    for (const action of ['start', 'rematch', 'lobby']) for (const button of this.root.querySelectorAll<HTMLButtonElement>(`[data-room="${action}"]`)) {
      const quickRematch = state.quick && action === 'rematch';
      button.hidden = quickRematch ? false : !host;
      button.disabled = quickRematch ? players.length < 2 || state.rematchReady.includes(this.client.id) || this.client.now >= state.rematchUntil
        : !host || (action !== 'lobby' && players.length < 2);
    }
    this.quickResult(state);
    if (!state.quick) this.element('match-host-note').textContent = host ? '' : 'Waiting for the host…';
    for (const button of this.root.querySelectorAll<HTMLElement>('#matchEnd [data-quick]')) button.hidden = !state.quick;
    this.root.querySelector<HTMLElement>('#matchEnd [data-room=leave]')!.hidden = state.quick;
    this.element('round-label').textContent = `ROUND ${state.round} · FIRST TO 2`;
    for (let slot = 0; slot < CONFIG.MAX_PLAYERS_PRIVATE; slot++) {
      const p = players.find(p => p.slot === slot), card = this.element(`match-player-${slot}`);
      card.hidden = !p;
      if (p) {
        card.querySelector('strong')!.textContent = `${p.name}${p.id === this.client.id ? ' (YOU)' : ''}`;
        const portrait = card.querySelector<HTMLElement>('.card-animal')!;
        if (portrait.dataset.animal !== String(p.animal)) { portrait.innerHTML = animalIcon(p.animal); portrait.dataset.animal = String(p.animal); }
        const symbols = card.querySelector<HTMLElement>('.card-symbols')!, key = `${p.hearts}/${p.wins}/${p.waiting}`;
        if (symbols.dataset.value !== key) { symbols.innerHTML = p.waiting ? 'Watching' : heartIcons(p.hearts) + winPips(p.wins); symbols.dataset.value = key; }
      }
    }
    const winner = state.players.find(p => p.id === state.winner);
    const score = state.players.filter(p => !p.waiting).map(p => `${p.name}: ${p.wins}`).join(' · ');
    this.element('round-result-title').textContent = winner ? `ROUND ${state.round} \u2014 ${winner.name.toUpperCase()} WINS!` : `ROUND ${state.round} \u2014 DRAW!`;
    this.element('round-result-score').textContent = score;
    this.element('match-result-title').textContent = winner ? `${winner.name.toUpperCase()} WINS!` : 'MATCH OVER';
    this.element('match-result-score').textContent = score;
    this.element('match-result-reason').textContent = state.reason.includes('left') ? state.reason : 'Good brawl!';
    for (const kind of ['round', 'match']) {
      const screen = this.element(kind === 'round' ? 'roundEnd' : 'matchEnd');
      screen.style.setProperty('--winner', winner ? COLORS.players[winner.slot]! : COLORS.yellow);
      this.element(`${kind}-winner-animal`).innerHTML = winner ? animalIcon(winner.animal) : '';
      this.element(`${kind}-winner-pips`).innerHTML = winner ? winPips(winner.wins) : '';
    }
  }
  private quickResult(state: RoomSnapshot): void {
    if (!state.quick || state.phase !== 'matchEnd') return;
    const remaining = Math.max(0, Math.ceil((state.rematchUntil - this.client.now) / 1000));
    this.element('match-host-note').textContent = !remaining ? 'Rematch expired — find a new opponent.'
      : state.rematchReady.some(id => id !== this.client.id) ? `Opponent wants a rematch! · ${remaining}s`
      : state.rematchReady.includes(this.client.id) ? `Waiting for opponent… · ${remaining}s` : `Rematch? · ${remaining}s`;
    this.root.querySelector<HTMLButtonElement>('[data-room=rematch]')!.disabled = !remaining || state.rematchReady.includes(this.client.id) || state.players.filter(p => p.connected).length < 2;
  }
  private frame(dt: number): void {
    const state = this.client.state; if (!state) return;
    this.quickResult(state);
    this.game.rig.shake = 0;
    this.poseTime += dt; this.client.advance(); const now = this.client.now;
    const me = state.players.find(p => p.id === this.client.id);
    this.input.enabled = this.client.ready && state.phase === 'playing' && !me?.waiting && (me?.hearts ?? 0) > 0;
    this.game.playing = state.phase === 'playing';
    const time = roomWorldTime(state, this.client.time, this.poseTime);
    this.game.worldTime = time; this.game.rig.targetCamZ = state.camZ; this.game.rig.leaderZ = state.leaderZ;
    if (state.phase === 'playing') {
      this.railSound.update(this.game.world.rows, state.camZ, time, this.game.home.sound, this.client.prediction.x, this.client.prediction.z, !this.client.prediction.dead, this.game.home.arena);

    }
    if (state.phase === 'lobby') this.railSound.menu(this.poseTime, this.game.home.sound, this.game.home.arena, 4, SOLO.SPAWN_Z);
    const countdown = this.element('match-countdown');
    countdown.textContent = state.phase === 'countdown' ? String(Math.max(1, Math.ceil((state.startAt - now) / 1000)))
      : state.phase === 'playing' && now - state.startAt < SOLO.HOP_BANNER_MS ? 'HOP!' : '';
    if (countdown.textContent !== this.lastCountdown) {
      this.lastCountdown = countdown.textContent ?? '';
      if (/^[123]$/.test(this.lastCountdown)) this.game.home.sound.play('countdown');
    }
    const status = this.element('match-status');
    status.textContent = !this.client.ready ? 'Resyncing…' : me?.waiting ? 'Watching — you join next match' : me?.respawnAt ? `Back in ${Math.max(1, Math.ceil((me.respawnAt - now) / 1000))}…` : me?.hearts === 0 ? 'OUT — watching the brawl' : '';
    const last = state.players.some(p => p.wins >= CONFIG.ROUNDS_TO_WIN) || state.round >= ROOM.MAX_ROUNDS && !!state.winner;
    this.element('round-next').textContent = `${last ? 'Match results' : 'Next round'} in ${Math.max(1, Math.ceil((state.nextAt - now) / 1000))}`;
    const pair = this.client.pair();
    for (const p of state.players) {
      const actor = this.actors.get(p.id); if (!actor) continue;
      const lobby = state.phase === 'lobby';
      let movement = p.id === this.client.id && state.phase === 'playing' && !p.movement.dead ? this.client.prediction : p.movement;
      let x = movement.x, z = movement.z, drawTime = time;
      if (p.id !== this.client.id && pair && state.phase === 'playing') {
        const a = pair.a.players.find(v => v.id === p.id), b = pair.b.players.find(v => v.id === p.id);
        if (a && b) {
          drawTime = Math.max(0, (this.client.now - CONFIG.INTERP_DELAY_MS - state.startAt) / 1000);
          movement = remoteMovement(a, b, drawTime);
        }
      }
      sampleHop(movement, drawTime, this.game.world.rowAt, this.hopPose);
      const pose = this.hopPose; x = pose.x; z = pose.z;
      if (lobby) { x = ROOM.SPAWNS[2]![p.slot]!; z = SOLO.SPAWN_Z; pose.y = 0; pose.sx = pose.sy = 1; pose.roll = 0; }
      if (!lobby && !movement.dead && !pose.hopping && movement.hops > 0 && actor.landedHop !== movement.hopStart) {
        actor.landedHop = movement.hopStart;
        this.game.particles.burst(x, z, BIOME_PALETTES[this.game.world.rowAt(z).biome].grass[0]);
        if (movement.onLog) { this.game.world.dipLog(z, movement.logIndex, time); this.game.home.sound.play('log', (x - this.client.prediction.x) / SOUND.PAN_TILES); }
      }
      actor.root.visible = p.connected && !p.waiting;
      actor.root.position.set(x, pose.y + respawnHeight(this.poseTime - actor.respawnAt, this.preferences.reducedMotion), -z);
      actor.heading = actor.facing.update(ANGLE[movement.direction], this.poseTime);
      actor.root.rotation.set(0, lobby ? HOME.ANIMAL_YAW : actor.heading, this.preferences.reducedMotion ? 0 : pose.roll);
      actor.root.scale.set(pose.sx, pose.sy, pose.sx);
      const dying = !!p.movement.dead || (p.id === this.client.id && !!this.client.prediction.dead);
      const elapsed = this.poseTime - actor.deathAt;
      if (dying && actor.deathCause) {
        deathPose(actor.deathCause, elapsed, actor.deathX < 0 ? -1 : 1, this.preferences.reducedMotion, this.deathPose);
        const death = this.deathPose;
        actor.root.position.set(actor.deathX + death.x, death.y, -actor.deathZ);
        actor.root.rotation.z = death.roll; actor.root.scale.set(death.sx, death.sy, death.sx);
        for (const material of actor.materials) material.opacity = actor.deathCause === 'FLATTENED!' && material.side === BackSide ? 0 : death.opacity;
        actor.root.visible &&= actor.deathCause === 'FLATTENED!' ? death.opacity > 0 : elapsed < SOLO.DEATH_MS / 1000;
        if (elapsed < SOLO.DEATH_SHAKE_S && Math.hypot(actor.deathX - this.client.prediction.x, actor.deathZ - this.client.prediction.z) <= SOLO.DEATH_SHAKE_DISTANCE)
          this.game.rig.shake = Math.max(this.game.rig.shake, SOLO.DEATH_SHAKE * (1 - elapsed / SOLO.DEATH_SHAKE_S));
      } else {
        for (const material of actor.materials) material.opacity = 1;
        if (!lobby && movement.invulnerableUntil > time && !this.preferences.reducedMotion)
          actor.root.visible &&= Math.floor(this.poseTime * SOLO.PROTECT_BLINK_HZ * 2) % 2 === 0;
      }
      actor.deathEffects.update(dying ? actor.deathCause : null, elapsed, actor.deathX, actor.deathZ);
      actor.effects.root.position.copy(actor.root.position);
      actor.effects.update(this.poseTime, actor.boxer.move, this.preferences.reducedMotion);
      actor.boxer.reduced = this.preferences.reducedMotion;
      actor.boxer.comboYaw = Math.atan2(this.game.rig.camera.position.x - actor.root.position.x, -(this.game.rig.camera.position.z - actor.root.position.z)) + actor.root.rotation.y;
      actor.boxer.comboLift = BOXER.COMBO_LIFT;
      // Hop rig follows the same delayed/predicted clock as the body, including buffered hops.
      actor.hopReview.elapsed = drawTime - movement.hopStart;
      actor.boxer.review = dying ? { move: 'guard', elapsed: 0 } : pose.hopping ? actor.hopReview : null;
      actor.boxer.update(this.poseTime);
      const label = this.element(`match-name-${p.slot}`); label.hidden = !actor.root.visible || lobby;
      label.textContent = `${p.name}${p.id === this.client.id ? ' ▼' : ''}${movement.invulnerableUntil > time ? ' ✦' : ''}`;
      this.point.set(x, SOLO.NAME_HEIGHT, -z).project(this.game.rig.camera);
      label.style.transform = `translate(${(this.point.x + 1) * innerWidth / 2}px,${(1 - this.point.y) * innerHeight / 2}px) translate(-50%,-50%)`;
    }
    if (state.phase === 'playing') for (const slot of this.game.world.rows) if (slot.row?.kind === 'rail') {
      const train = trainX(slot.row, time);
      if (train !== null && Math.abs(train - this.client.prediction.x) < WORLD.TRAIN_LENGTH / 2 + CONFIG.COLUMNS
        && Math.abs(slot.z - this.client.prediction.z) <= RAIL.SHAKE_DISTANCE) this.game.rig.shake = Math.max(this.game.rig.shake, RAIL.SHAKE_AMPLITUDE);
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
