import { Howl, Howler } from 'howler';
import { CONFIG, SOLO, SOUND, VIEW } from '../../../shared/config';
import type { Biome } from '../../../shared/types';
import type { DeathCause } from '../../../shared/movement';
import manifest from './audio-manifest.json';
import { downloads, registerAsset } from '../ui/downloads';
import { voiceToSteal } from './audio-policy';
import type { Voice } from './audio-policy';
type Cue = keyof typeof manifest.sfx;
type Track = keyof typeof manifest.music;
type Sprite = Record<string, [number, number, boolean]>;
let musicFile = 'brawl.ogg';
export function registerAudio(): void {
  musicFile = Howler.codecs('ogg') ? 'brawl.ogg' : 'brawl.m4a';
  registerAsset('/sfx/brawl.mp3', 'brawl.mp3'); registerAsset(`/music/${musicFile}`, musicFile);
}
/** Howler owns playback/decoding; this small adapter routes only music through a low-pass.
 * _soundById/_node are isolated here and covered by browser tests against the pinned Howler version. */
function musicNode(howl: Howl, id: number): GainNode | undefined {
  return (howl as unknown as { _soundById(id: number): { _node: GainNode } | undefined })._soundById(id)?._node;
}
export class BoxingSound {
  private sfx?: Howl; private music?: Howl; private filter?: BiquadFilterNode;
  private loaded = false; private unlocked = false; private loading: Promise<void> | undefined;
  private sfxVolume: number = VIEW.SFX_VOLUME; private musicLevel: number = VIEW.MUSIC_VOLUME;
  private voices: Voice[] = []; private seen = new Set<string>();
  private track: Track = 'menu'; private musicId = -1; private fadingId = -1;
  private rate = 1; private muffled = false; private paused = false; private ducked = false;
  private delayed = new Set<number>();
  private duckTimer = 0; private fanfareTimer = 0;
  private background = false; private audioTransition = Promise.resolve(); private playingTrack: Track | null = null;
  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => this.setBackground(document.hidden));
    window.addEventListener('pagehide', () => this.setBackground(true));
    window.addEventListener('pageshow', () => this.setBackground(document.hidden));
  }
  private setBackground(hidden: boolean): void {
    this.background = hidden;
    const ctx = Howler.ctx;
    if (!ctx) return;
    // Silence synchronously, then serialize suspend/resume to survive rapid tab swaps.
    if (hidden) {
      Howler.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      Howler.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      this.sfx?.stop(); this.voices.length = 0;
      for (const timer of this.delayed) clearTimeout(timer); this.delayed.clear();
    }
    this.audioTransition = this.audioTransition.then(async () => {
      if (this.background) { await ctx.suspend(); return; }
      const gain = Howler.masterGain.gain;
      gain.cancelScheduledValues(ctx.currentTime); gain.setValueAtTime(0, ctx.currentTime);
      gain.linearRampToValueAtTime(Howler.volume(), ctx.currentTime + SOUND.BACKGROUND_FADE_MS / 1000);
      if (!this.unlocked) return;
      await ctx.resume();
      if (this.background) { await ctx.suspend(); return; }
      if (this.musicId < 0 || this.playingTrack !== this.track) this.startMusic(0);
    }).catch(() => { /* A browser may require the next user gesture to resume. */ });
  }
  get volume(): number { return this.sfxVolume; }
  set volume(value: number) { this.sfxVolume = value; this.sfx?.mute(value === 0); for (const v of this.voices) this.sfx?.volume(value * v.level, v.id); }
  get musicVolume(): number { return this.musicLevel; }
  set musicVolume(value: number) { this.musicLevel = value; this.music?.mute(value === 0); this.mix(); }
  get diagnostics() { return { background: this.background, context: Howler.ctx?.state, loaded: this.loaded, unlocked: this.unlocked, track: this.track, musicId: this.musicId,
    musicRate: this.rate, muffled: this.muffled, paused: this.paused, ducked: this.ducked,
    voices: this.voices.filter(v => this.sfx?.playing(v.id)).length + (this.music?.playing(this.musicId) ? 1 : 0) + (this.music?.playing(this.fadingId) ? 1 : 0),
    filterHz: this.filter?.frequency.value ?? SOUND.MUSIC_OPEN_HZ, musicVolume: this.musicLevel, sfxVolume: this.volume }; }
  load(): Promise<void> {
    return this.loading ??= this.decode().catch(error => { this.loading = undefined; throw error; });
  }
  private async decode(): Promise<void> {
    await downloads.load();
    const load = (path: string, format: string, sprite: Sprite) => new Promise<Howl>((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([downloads.bytes(path)]));
      const howl = new Howl({ src: [url], format: [format], sprite, volume: 0, preload: true, pool: SOUND.MAX_VOICES,
        onload: () => { URL.revokeObjectURL(url); resolve(howl); },
        onloaderror: (_id, error) => { URL.revokeObjectURL(url); downloads.invalidate(path); howl.unload(); reject(new Error(`Audio decode failed: ${path}: ${error}`)); } });
    });
    this.sfx?.unload(); this.music?.unload();
    const [sfx, music] = await Promise.all([load('/sfx/brawl.mp3', 'mp3', manifest.sfx as unknown as Sprite), load(`/music/${musicFile}`, musicFile.endsWith('ogg') ? 'ogg' : 'm4a', manifest.music as unknown as Sprite)]);
    this.sfx = sfx; this.music = music;
    if (Howler.ctx) { this.filter = Howler.ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = SOUND.MUSIC_OPEN_HZ; this.filter.connect(Howler.masterGain); }
    this.loaded = true; if (this.background || document.hidden) this.setBackground(true);
  }
  unlock(): void {
    if (this.background || document.hidden || !this.loaded || this.unlocked && Howler.ctx?.state === 'running') return;
    const start = () => {
      this.unlocked = true;
      if (!this.background && !document.hidden && Howler.ctx) {
        const gain = Howler.masterGain.gain;
        gain.cancelScheduledValues(Howler.ctx.currentTime);
        gain.setValueAtTime(Howler.volume(), Howler.ctx.currentTime);
      }
      if (this.musicId < 0) this.startMusic(SOUND.MUSIC_INTRO_MS);
    };
    if (Howler.ctx?.state !== 'running') void Howler.ctx?.resume().then(start).catch(() => {}); else start();
  }
  play(cue: Cue | 'hop' | 'win', pan = 0, level = SOUND.PLAYER_GAIN as number, animal = 2): number {
    if (!this.unlocked || !this.sfx || !this.volume || this.background || document.hidden) return -1;
    const key: Cue = cue === 'hop' ? `hop${Math.floor(Math.random() * 3)}` as Cue : cue === 'win' ? 'roundWin' : cue;
    const priority = key === 'bell' || key === 'horn' ? 3 : 2;
    const id = this.allocate(key, pan, level, priority, false, '');
    if (id >= 0 && cue === 'hop') this.sfx.rate(SOUND.ANIMAL_PITCH[animal] ?? 1, id);
    return id;
  }
  private allocate(cue: Cue, pan: number, level: number, priority: number, loop: boolean, key: string): number {
    this.voices = this.voices.filter(v => this.sfx!.playing(v.id));
    const steal = voiceToSteal(this.voices, priority, loop);
    if (steal === -1) return -1;
    if (steal !== null) { this.sfx!.stop(steal); this.voices = this.voices.filter(v => v.id !== steal); }
    const id = this.sfx!.play(cue);
    this.sfx!.loop(loop, id); this.sfx!.stereo(Math.max(-1, Math.min(1, pan)), id); this.sfx!.rate(1, id); this.sfx!.volume(this.volume * level, id);
    this.voices.push({ id, priority, level, loop, key }); return id;
  }
  beginWorld(): void { this.seen.clear(); }
  loop(key: string, cue: Cue, pan: number, level: number): void {
    if (!this.unlocked || !this.sfx || this.background || document.hidden || this.volume === 0 || level <= 0) return;
    this.seen.add(key);
    const existing = this.voices.find(v => v.key === key && this.sfx!.playing(v.id));
    if (existing) { existing.level = level; this.sfx.volume(this.volume * level, existing.id); this.sfx.stereo(pan, existing.id); }
    else this.allocate(cue, pan, level, 0, true, key);
  }
  endWorld(): void { for (const v of this.voices) if (v.loop && !this.seen.has(v.key)) this.sfx?.stop(v.id); }
  stopWorld(): void { this.beginWorld(); this.endWorld(); }
  resetRound(): void {
    for (const timer of this.delayed) clearTimeout(timer); this.delayed.clear();
    this.sfx?.stop(); this.voices.length = 0; clearTimeout(this.duckTimer); clearTimeout(this.fanfareTimer);
    this.ducked = false; this.muffle(false); this.mix();
  }
  biome(biome: Biome): void { if (this.track !== 'menu' && this.track !== biome) this.changeMusic(biome, SOUND.MUSIC_BIOME_FADE_MS); }
  death(cause: DeathCause, pan = 0): void {
    if (cause === 'FLATTENED!') this.play('squash', pan);
    else if (cause === 'SPLASH!' || cause === 'SWEPT AWAY!') { this.play('splash', pan); if (cause === 'SWEPT AWAY!') this.play('whoosh', pan); }
    else if (cause === 'DERAILED!') { this.play('impact', pan); this.play('horn', pan, SOUND.WARNING_GAIN); }
    else this.play('fall', pan);
    this.play('heartLost', pan);
    if (cause === 'SPLASH!') { const timer = window.setTimeout(() => { this.delayed.delete(timer); this.play('bubbles', pan); }, SOLO.BUBBLE_START_S * 1000); this.delayed.add(timer); }
  }
  menu(): void {
    if (this.track !== 'menu' || this.muffled) this.resetRound();
    this.rate = 1; this.changeMusic('menu', CONFIG.MUSIC_CROSSFADE_MS);
  }
  gameplay(biome: Biome = 'meadow', final = false): void {
    clearTimeout(this.fanfareTimer); this.rate = final ? CONFIG.FINAL_ROUND_MUSIC_RATE : 1;
    this.muffle(false); this.changeMusic(biome, this.track === 'menu' ? CONFIG.MUSIC_CROSSFADE_MS : SOUND.MUSIC_BIOME_FADE_MS);
    if (this.musicId >= 0) this.music?.rate(this.rate, this.musicId);
  }
  muffle(value: boolean, pause = false): void {
    if (this.muffled === value && this.paused === pause) return;
    this.muffled = value; this.paused = pause;
    this.filter?.frequency.setTargetAtTime(value ? SOUND.MUSIC_FILTER_HZ : SOUND.MUSIC_OPEN_HZ, Howler.ctx.currentTime, SOUND.MIX_RAMP_S); this.mix();
  }
  sting(cue: 'roundWin' | 'matchWin' | 'gameOver' | 'newBest'): void {
    this.play(cue); this.ducked = true; this.mix(); clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => { this.ducked = false; this.mix(); }, manifest.sfx[cue][1] as number);
    if (cue === 'matchWin') { clearTimeout(this.fanfareTimer); this.fanfareTimer = window.setTimeout(() => this.menu(), manifest.sfx.matchWin[1] as number); }
  }
  private targetVolume(): number { return this.musicLevel * SOUND.MUSIC_GAIN * (this.paused ? SOUND.PAUSE_GAIN : 1) * (this.ducked ? SOUND.MUSIC_DUCK : 1); }
  private mix(): void { if (this.musicId >= 0) this.music?.fade(this.music.volume(this.musicId) as number, this.targetVolume(), SOUND.MIX_RAMP_S * 1000, this.musicId); }
  private changeMusic(track: Track, ms: number): void {
    if (this.track === track && this.musicId >= 0) return;
    this.track = track; if (this.unlocked) this.startMusic(ms);
  }
  private startMusic(ms: number): void {
    if (!this.music || this.background || document.hidden) return;
    this.playingTrack = this.track;
    if (this.fadingId >= 0) this.music.stop(this.fadingId);
    const previous = this.musicId;
    const id = this.music.play(this.track); this.musicId = id;
    const node = musicNode(this.music, id); if (node && this.filter) { node.disconnect(); node.connect(this.filter); }
    this.music.rate(this.rate, id); this.music.volume(0, id); this.music.fade(0, this.targetVolume(), ms, id);
    if (previous >= 0) { this.fadingId = previous; this.music.fade(this.music.volume(previous) as number, 0, ms, previous);
      window.setTimeout(() => { if (this.fadingId === previous) { this.music?.stop(previous); this.fadingId = -1; } }, ms); }
  }
}
