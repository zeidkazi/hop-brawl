import { Vector3 } from 'three';
import { COLORS, CONFIG, HOME, RAIL, SOLO, VIEW, WORLD } from '../../../shared/config';
import { Movement } from '../../../shared/movement';
import { trainWarning, trainX } from '../../../shared/hazards';
import type { DeathCause, HopDirection } from '../../../shared/movement';
import type { GameRenderer } from './renderer';
import { HopInput } from './input';
import type { Preferences } from '../ui/settings';
import type { Motion } from '../ui/motion';
import type { Boxer } from './boxer';

export const SOLO_BEST_KEY = 'hop-brawl-solo-best';
export function readBest(storage: Pick<Storage, 'getItem'>): number | null {
  try {
    const raw = storage.getItem(SOLO_BEST_KEY); if (raw === null || !/^\d+$/.test(raw)) return null;
    const value = Number(raw); return Number.isSafeInteger(value) && value >= 0 ? value : null;
  } catch { return null; }
}
type Phase = 'inactive' | 'countdown' | 'playing' | 'paused' | 'dying' | 'over';
type SoloScreen = 'solo' | 'pause' | 'soloEnd' | 'home';
const ANGLES: Record<HopDirection, number> = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
const X: Record<HopDirection, number> = { up: 0, down: 0, left: -1, right: 1 };
const Z: Record<HopDirection, number> = { up: 1, down: -1, left: 0, right: 0 };

/** One local run in the existing scene. No networking, world reload or per-frame object creation. */
export class Solo {
  readonly movement: Movement;
  readonly input: HopInput;
  phase: Phase = 'inactive';
  best: number | null = readBest({ getItem: key => localStorage.getItem(key) });
  private runBest = 0; private newBest = false;
  private countdownEnd = 0; private previousWall = 0; private roundTime = 0; private poseTime = 0;
  private countdownDuration: number = SOLO.COUNTDOWN_MS;
  private warned = false;
  private nextBell = 0;
  private arenaRow = NaN;
  private readonly sceneryRow = (z: number) => this.game.world.rows.find(slot => slot.z === z)?.row ?? undefined;
  private deathAt = 0; private bonkAt = -Infinity; private bonkDirection: HopDirection = 'up';
  private heading = 0; private lastScore = -1; private lastCountdown = '';
  private boxer: Boxer | null = null;
  private readonly point = new Vector3();
  private readonly seed = new Uint32Array(1);
  private readonly score: HTMLElement; private readonly bestLabel: HTMLElement;
  private readonly countdown: HTMLElement; private readonly cause: HTMLElement; private readonly danger: HTMLElement;
  private readonly marker: HTMLElement; private readonly name: HTMLElement; private readonly flag: HTMLElement;
  private readonly heart: HTMLElement;
  get active(): boolean { return this.phase !== 'inactive'; }

  constructor(private readonly root: HTMLElement, readonly game: GameRenderer, private readonly preferences: Preferences,
    private readonly motion: Motion, private readonly show: (screen: SoloScreen) => void) {
    const element = (id: string): HTMLElement => root.querySelector<HTMLElement>(`#${id}`)!;
    this.score = element('solo-distance'); this.bestLabel = element('solo-best'); this.countdown = element('solo-countdown');
    this.cause = element('solo-cause'); this.danger = element('solo-danger'); this.marker = element('solo-you');
    this.name = element('solo-name'); this.flag = element('solo-best-flag'); this.heart = element('solo-heart');
    this.movement = new Movement(game.world.rowAt);
    this.movement.belowScreen = (x, z, camZ) => game.rig.screenY(x, z, camZ) >= 1;
    this.input = new HopInput(game.canvas, this.hop);
    this.movement.onHop = this.hopped; this.movement.onLand = this.landed; this.movement.onDeath = this.died;
    this.movement.onBonk = direction => {
      this.bonkAt = this.poseTime; this.bonkDirection = direction; game.home.sound.play('hit');
      if ((direction === 'left' && this.movement.x < 1) || (direction === 'right' && this.movement.x > 7)) {
        game.world.boundarySide = direction === 'left' ? -1 : 1;
        game.world.boundaryUntil = this.movement.time + VIEW.BOUNDARY_PULSE_MS / 1000;
      }
    };
    game.beforeFrame = this.frame;
    root.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-solo]') : null;
      if (!button) return;
      const action = button.dataset.solo;
      if (action === 'pause') this.pause();
      else if (action === 'resume') this.resume();
      else if (action === 'restart') this.restart();
      else if (action === 'quit') this.quit();
    });
    window.addEventListener('keydown', event => {
      if (!this.active || event.repeat || event.target instanceof HTMLInputElement) return;
      if (!['solo', 'pause', 'soloEnd'].includes(root.dataset.screen ?? '')) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (this.phase === 'paused') this.resume(); else this.pause();
      } else if (this.phase === 'over' && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault(); this.restart();
      }
    });
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    root.querySelector('[data-mode="solo"]')?.classList.toggle('practice', this.best === null);
  }

  start(retry = false, countdownOrigin = performance.now()): void {
    const game = this.game;
    if (!this.active) {
      game.home.select(this.preferences.animal); this.boxer = game.home.boxers[this.preferences.animal]!;
      game.scene.add(game.home.animalRoot);
      game.scene.add(game.home.effects.root);
      if (game.home.arena) {
        game.scene.add(game.home.arena.root); game.home.arena.root.rotation.y = Math.PI;
        game.home.arena.root.position.set(CONFIG.COLUMNS - 1, 0, 0);
      }
    }
    crypto.getRandomValues(this.seed);
    game.world.reset(this.seed[0]!); this.movement.reset();
    game.world.showCrates = false; // Crate/boost rules are milestone 9.
    game.world.actorVisible = false; game.world.animal = this.preferences.animal;
    game.rig.resetScroll(retry); game.go('gameplay'); game.desaturation.value = 0;
    game.home.setActorOpacity(1); game.world.deathCause = null;
    this.roundTime = this.poseTime = 0; this.runBest = this.best ?? 0; this.newBest = false; this.lastScore = -1;
    this.warned = false; this.nextBell = 0; this.arenaRow = NaN;
    this.heading = 0; this.bonkAt = -Infinity; this.cause.hidden = true;
    this.name.textContent = this.preferences.name; this.bestLabel.textContent = `BEST ${this.runBest}`;
    this.flag.hidden = this.runBest === 0; this.heart.style.opacity = '1'; this.heart.style.transform = '';
    game.home.animalRoot.visible = true; game.home.animalRoot.scale.setScalar(1);
    this.boxer!.update(0); this.boxer!.countdown();
    this.beginCountdown(retry ? SOLO.RETRY_COUNTDOWN_MS : SOLO.COUNTDOWN_MS, countdownOrigin);
    this.renderPose(0);
  }
  private beginCountdown(duration: number, origin = performance.now()): void {
    this.phase = 'countdown'; this.input.enabled = false; this.input.clear(); this.game.playing = false;
    this.previousWall = performance.now(); this.countdownEnd = origin + duration;
    this.countdownDuration = duration;
    this.lastCountdown = ''; this.countdown.hidden = false; this.show('solo');
  }
  pause(): void {
    if (this.phase !== 'playing' && this.phase !== 'countdown') return;
    this.phase = 'paused'; this.input.enabled = false; this.input.clear(); this.movement.buffered = null;
    this.game.playing = false; this.show('pause');
  }
  resume(): void {
    if (this.phase !== 'paused') return;
    this.boxer?.countdown(); this.beginCountdown(SOLO.COUNTDOWN_MS);
  }
  restart(): void {
    if (this.phase !== 'over' && this.phase !== 'paused') return;
    this.phase = 'paused'; this.input.enabled = false;
    const started = performance.now();
    this.motion.tileFlip(() => { this.start(true, started); });
  }
  quit(): void {
    if (!this.active) return;
    this.input.enabled = false; this.input.clear(); this.phase = 'inactive';
    this.game.playing = false; this.game.worldTime = null; this.game.desaturation.value = 0;
    this.game.home.setActorOpacity(1);
    this.game.world.actorVisible = true; this.game.world.showCrates = true;
    const home = this.game.home; home.root.add(home.animalRoot);
    home.root.add(home.effects.root);
    home.effects.root.scale.setScalar(HOME.ANIMAL_SCALE);
    if (home.arena) { home.root.add(home.arena.root); home.arena.root.position.set(0, 0, 0); home.arena.root.rotation.y = 0; home.arena.restoreHome(); }
    home.animalRoot.position.set(4, 0, HOME.ANIMAL_Z); home.animalRoot.scale.setScalar(HOME.ANIMAL_SCALE);
    home.animalRoot.rotation.set(0, HOME.ANIMAL_YAW, 0); home.animalRoot.visible = true;
    this.boxer?.play('idle');
    this.game.rig.resetScroll(); this.game.go('home'); this.show('home');
    this.root.querySelector('[data-mode="solo"]')?.classList.toggle('practice', this.best === null);
  }
  private readonly hop = (direction: HopDirection): void => { if (this.phase === 'playing') this.movement.input(direction); };
  private readonly hopped = (): void => {
    this.boxer?.play('hop'); this.game.home.sound.unlock();
    if (this.preferences.haptics) navigator.vibrate?.(SOLO.HAPTIC_HOP_MS);
  };
  private readonly landed = (): void => {
    const player = this.movement;
    this.game.particles.burst(player.x, player.z);
    if (player.onLog) { this.game.world.logDipRow = player.z; this.game.world.logDipUntil = player.time + CONFIG.HOP_MS / 1000; }
    if (player.distance > this.runBest && !this.newBest) {
      this.newBest = true; this.motion.toast('NEW BEST!');
      for (let i = 0; i < SOLO.NEW_BEST_PARTICLES; i++) this.game.particles.burst(player.x, player.z);
    }
  };
  private readonly died = (cause: DeathCause): void => {
    this.game.rig.targetCamZ = this.movement.camZ;
    this.game.rig.leaderZ = Math.max(SOLO.SPAWN_Z, this.movement.distance);
    this.game.rig.update(0, this.poseTime);
    this.phase = 'dying'; this.deathAt = this.poseTime; this.input.enabled = false; this.game.playing = false;
    this.game.go('soloEnd'); this.cause.textContent = cause; this.cause.hidden = false; this.countdown.hidden = true;
    this.game.home.sound.play('hit');
    if (this.preferences.haptics) navigator.vibrate?.(SOLO.HAPTIC_DEATH_MS);
    this.best = Math.max(this.best ?? 0, this.movement.distance);
    try { localStorage.setItem(SOLO_BEST_KEY, String(this.best)); } catch { /* Session best remains usable. */ }
    this.game.world.deathCause = cause; this.game.world.deathX = this.movement.x; this.game.world.deathZ = this.movement.z;
    if (cause === 'SPLASH!' || cause === 'LEFT BEHIND!') this.game.particles.burst(this.movement.x, this.movement.z, cause === 'SPLASH!' ? COLORS.water : COLORS.cream);
    this.heart.style.opacity = '0'; this.heart.style.transform = `translateY(${SOLO.HEART_FALL_PX}px) rotate(${SOLO.HEART_SPIN_DEG}deg)`;
  };
  private readonly frame = (now: number, dt: number): void => {
    if (!this.active) return;
    const elapsed = Math.max(0, now - this.previousWall) / 1000; this.previousWall = now;
    this.game.rig.shake = 0;
    if (this.phase !== 'paused') this.poseTime += dt;
    if (this.phase === 'countdown') {
      const remaining = this.countdownEnd - now;
      const label = String(Math.max(1, Math.ceil(remaining / (this.countdownDuration / 3))));
      if (label !== this.lastCountdown) { this.countdown.textContent = label; this.lastCountdown = label; }
      if (remaining <= 0) {
        this.phase = 'playing'; this.input.enabled = true; this.game.playing = true;
        this.countdown.textContent = 'HOP!'; this.boxer?.countdown(true);
      }
    } else if (this.phase === 'playing') {
      this.roundTime += elapsed; this.movement.advance(this.roundTime);
      let warning = false;
      for (const slot of this.game.world.rows) if (slot.row?.kind === 'rail' && slot.z >= this.movement.camZ && slot.z <= this.movement.camZ + CONFIG.VIEW_ROWS) {
        if (trainWarning(slot.row, this.movement.time)) warning = true;
        const train = trainX(slot.row, this.movement.time);
        if (train !== null && Math.abs(train - this.movement.x) < WORLD.TRAIN_LENGTH / 2 + CONFIG.COLUMNS
          && Math.abs(slot.z - this.movement.z) <= RAIL.SHAKE_DISTANCE) this.game.rig.shake = RAIL.SHAKE_AMPLITUDE;
      }
      if (warning && (!this.warned || this.movement.time >= this.nextBell)) {
        this.game.home.sound.play('bell'); this.nextBell = this.movement.time + RAIL.BELL_INTERVAL_S;
      }
      this.warned = warning;
      if (now - this.countdownEnd > SOLO.HOP_BANNER_MS) this.countdown.hidden = true;
    } else if (this.phase === 'dying' || this.phase === 'over') {
      const deathMs = (this.poseTime - this.deathAt) * 1000;
      this.game.desaturation.value = Math.min(1, deathMs / SOLO.DESATURATE_MS) * SOLO.DESATURATE;
      if (this.phase === 'dying' && deathMs >= SOLO.DEATH_MS) {
        this.phase = 'over';
        this.root.querySelector('#solo-end-title')!.textContent = this.movement.dead;
        this.root.querySelector('#solo-final-score')!.textContent = `SCORE ${this.movement.distance}`;
        this.root.querySelector('#solo-final-best')!.textContent = `BEST ${this.best}`;
        (this.root.querySelector('#solo-new-best') as HTMLElement).hidden = !this.newBest;
        this.show('soloEnd');
      }
    }
    this.game.worldTime = this.movement.time;
    this.game.rig.targetCamZ = this.movement.camZ;
    this.game.rig.leaderZ = Math.max(SOLO.SPAWN_Z, this.movement.distance);
    this.game.world.animalX = this.movement.x; this.game.world.animalZ = this.movement.z;
    this.renderPose(dt);
    if (this.lastScore !== this.movement.distance) { this.lastScore = this.movement.distance; this.score.textContent = String(this.lastScore); }
    this.game.world.boundaryWarning = this.movement.onLog ? (this.movement.x < VIEW.LOG_EDGE_WARNING - .5 ? -1 : this.movement.x > 8.5 - VIEW.LOG_EDGE_WARNING ? 1 : 0) : 0;
    this.marker.textContent = this.game.world.boundaryWarning ? '!' : 'YOU ▼';
    this.danger.style.opacity = this.phase === 'playing' && this.game.rig.screenY(this.movement.x, this.movement.z) > VIEW.DANGER_SCREEN_Y
      ? String(SOLO.DANGER_OPACITY + (this.preferences.reducedMotion ? 0 : Math.sin(this.poseTime * SOLO.DANGER_RATE) * SOLO.DANGER_PULSE)) : '0';
    this.marker.hidden = (this.roundTime * 1000 > SOLO.MARKER_MS && !this.game.world.boundaryWarning) || this.phase === 'dying' || this.phase === 'over';
    this.name.hidden = this.phase === 'over' || (this.phase === 'dying' && this.movement.dead === 'LEFT BEHIND!');
    this.flag.hidden = this.runBest === 0 || this.runBest < this.movement.camZ || this.runBest >= this.movement.camZ + CONFIG.VIEW_ROWS;
    this.project(this.marker, this.movement.x, SOLO.NAME_HEIGHT, this.movement.z, -SOLO.MARKER_GAP_PX);
    this.project(this.name, this.movement.x, SOLO.NAME_HEIGHT, this.movement.z);
    if (!this.flag.hidden) this.project(this.flag, SOLO.FLAG_X, SOLO.FLAG_HEIGHT, this.runBest);
  };
  private renderPose(dt: number): void {
    const player = this.movement, actor = this.game.home.animalRoot;
    const p = player.hopping ? Math.min(1, (player.time - player.hopStart) * 1000 / CONFIG.HOP_MS) : 0;
    let y = player.onLog ? SOLO.LOG_TOP : 0, sy = 1, sx = 1;
    if (player.hopping) {
      y = (this.game.world.rowAt(player.fromZ).kind === 'river' ? SOLO.LOG_TOP * (1 - p) : 0)
        + (this.game.world.rowAt(player.toZ).kind === 'river' ? SOLO.LOG_TOP * p : 0);
      y += Math.sin(p * Math.PI) * SOLO.HOP_HEIGHT;
      sy = p < SOLO.ANTICIPATION_MS / CONFIG.HOP_MS ? 1 - (1 - SOLO.SQUASH_Y) * Math.sin(p * Math.PI * CONFIG.HOP_MS / SOLO.ANTICIPATION_MS)
        : 1 + (SOLO.STRETCH_Y - 1) * Math.sin(p * Math.PI);
      sx = 1 + (1 - sy) / 2;
    }
    const target = ANGLES[player.direction]; let turn = target - this.heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn)); this.heading += turn * Math.min(1, dt * 1000 / SOLO.TURN_MS);
    actor.position.set(player.x, y, -player.z); actor.scale.set(sx, sy, sx); actor.rotation.set(0, this.heading, 0);
    const bonk = (this.poseTime - this.bonkAt) * 1000 / SOLO.BONK_MS;
    if (bonk < 1) { const offset = Math.sin(bonk * Math.PI) * SOLO.BONK_DISTANCE;
      actor.position.x += X[this.bonkDirection] * offset; actor.position.z -= Z[this.bonkDirection] * offset; }
    if (player.dead) {
      const t = Math.min(1, (this.poseTime - this.deathAt) * 1000 / SOLO.DEATH_MS);
      this.game.world.deathProgress = t;
      if (player.dead === 'FLATTENED!') actor.scale.y = Math.max(SOLO.FLATTEN_Y, 1 - t * SOLO.FLATTEN_RATE);
      else if (player.dead === 'SPLASH!') { actor.position.y -= t * SOLO.SINK_DEPTH; actor.scale.setScalar(1 - t * SOLO.SINK_SCALE); }
      else if (player.dead === 'DERAILED!') { actor.position.x += t * SOLO.TRAIN_FLING_X; actor.position.y += Math.sin(t * Math.PI) * SOLO.TRAIN_FLING_Y; actor.rotation.z = t * Math.PI * 2 * SOLO.TRAIN_SPINS; }
      else if (player.dead === 'SWEPT AWAY!') { actor.position.x += (player.x < 0 ? -1 : 1) * t * SOLO.SWEPT_TRAVEL; actor.rotation.z = Math.sin(t * SOLO.SWEPT_WOBBLE_RATE) * SOLO.SWEPT_WOBBLE; }
      else { this.game.home.setActorOpacity(1 - t); actor.visible = t < 1; }
      if (this.preferences.reducedMotion) actor.rotation.z = 0;
    }
    this.game.home.updateGameActor(this.poseTime);
    const arena = this.game.home.arena;
    if (arena) {
      arena.root.position.z = -Math.floor(player.camZ / SOLO.ARENA_SPAN) * SOLO.ARENA_SPAN;
      if (this.arenaRow !== Math.floor(player.camZ)) { this.arenaRow = Math.floor(player.camZ); arena.fitGameplay(this.sceneryRow); }
      arena.update(this.poseTime);
    }
  }
  private project(element: HTMLElement, x: number, y: number, z: number, offsetY = 0): void {
    this.point.set(x, y, -z).project(this.game.rig.camera);
    element.style.transform = `translate(${(this.point.x + 1) * innerWidth / 2}px,${(1 - this.point.y) * innerHeight / 2 + offsetY}px) translate(-50%,-50%)`;
    element.style.visibility = this.point.z > 1 || Math.abs(this.point.y) > SOLO.LABEL_CLIP ? 'hidden' : 'visible';
  }
}
