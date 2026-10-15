/** CC0 Kenney/OpenGameArt imports plus original procedural gap fills. See CREDITS.md. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { SOUND } from '../shared/config.ts';
const rate = SOUND.SAMPLE_RATE, tau = Math.PI * 2;
let seed = 84317;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
type Samples = Float32Array;
const buffer = (seconds: number) => new Float32Array(Math.round(seconds * rate));
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
function tone(a: Samples, start: number, length: number, frequency: number, gain = .3, color = 0, end = frequency) {
  let phase = 0;
  for (let j = 0; j < length * rate; j++) {
    const t = j / rate, p = t / length, i = (Math.round(start * rate) + j) % a.length;
    phase += tau * (frequency * (end / frequency) ** p) / rate;
    const envelope = Math.min(1, t / .004) * (1 - p) ** 2;
    const harmonic = Math.sin(phase) + color * (Math.sin(phase * 2) * .35 + Math.sin(phase * 3) * .15);
    a[i]! += harmonic * gain * envelope;
  }
}
function noise(a: Samples, start: number, length: number, gain: number, smooth = .6) {
  let low = 0;
  for (let j = 0; j < length * rate; j++) {
    const p = j / (length * rate), i = (Math.round(start * rate) + j) % a.length;
    low += (random() - low) * smooth; a[i]! += low * gain * Math.sin(Math.PI * p) * (1 - p);
  }
}
const sounds: Record<string, Samples> = {};
function sound(name: string, seconds: number, render: (a: Samples) => void) { const a = buffer(seconds); render(a); sounds[name] = a; }
for (let v = 0; v < 3; v++) sound(`hop${v}`, .18, a => { tone(a, 0, .16, 350 * SOUND.HOP_PITCH[v]!, .6, .25, 780); noise(a, .015, .12, .35); });
sound('bonk', .22, a => { tone(a, 0, .13, 160, .7, .4, 48); tone(a, .07, .12, 1200, .18, .5, 460); });
sound('splash', .65, a => { noise(a, 0, .5, 1.8, .22); for (let i = 0; i < 10; i++) tone(a, .04 * i, .16, 600 + i * 110, .15, 0, 160); });
sound('squash', .36, a => { tone(a, 0, .28, 190, .8, 1, 35); noise(a, .03, .18, 1.2, .8); });
sound('punch', .24, a => { noise(a, 0, .12, .9); tone(a, .035, .18, 150, .9, .5, 38); });
sound('whoosh', .32, a => noise(a, 0, .3, 1.7, .18));
sound('hit', .22, a => { tone(a, 0, .2, 120, .8, .4, 40); noise(a, 0, .1, 1); });
sound('tock', .13, a => { tone(a, 0, .12, 340, .65, .3, 120); });
sound('bell', .8, a => { for (const at of [0, .24]) { tone(a, at, .48, 1200, .32); tone(a, at, .44, 2844, .17); tone(a, at, .35, 3810, .08); } });
sound('horn', .85, a => { for (const f of [174, 220, 261]) tone(a, 0, .8, f, .28, 1, f * .96); });
sound('train', 2, a => { noise(a, 0, 2, 1.2, .09); for (let i = 0; i < 20; i++) { tone(a, i * .1, .07, 95, .2, 1, 45); noise(a, i * .1, .04, .4); } });
for (const [name, f] of [['rumble', 48], ['car', 92], ['truck', 52]] as const) sound(name, 2, a => {
  for (let i = 0; i < a.length; i++) { const t = i / rate; a[i] = (.18 * Math.sin(tau * f * t) + .08 * Math.sin(tau * f * 2 * t)) * (.85 + .15 * Math.sin(tau * 4 * t)); }
});
sound('honk', .32, a => { tone(a, 0, .28, 370, .4, 1); tone(a, 0, .28, 466, .3, 1); });
sound('water', 4, a => { for (let i = 0; i < 24; i++) { noise(a, i / 6, .65, .26, .035); tone(a, i / 6, .2, 600 + (random() + 1) * 500, .045, 0, 220); } });
sound('log', .2, a => { tone(a, 0, .16, 170, .65, .6, 80); noise(a, 0, .06, .35, .2); });
sound('bubbles', .7, a => { for (let i = 0; i < 3; i++) tone(a, i * .18, .15, 280, .4, 0, 1100 + i * 200); });
sound('fall', .75, a => tone(a, 0, .7, 900, .5, .3, 70));
sound('impact', .65, a => { tone(a, 0, .5, 100, .9, 1, 24); noise(a, .01, .5, 1.5, .3); });
sound('crowd', 4, a => { for (let i = 0; i < 36; i++) { const t = i / 9; tone(a, t, .45, 120 + (random() + 1) * 110, .1, 1, 170); noise(a, t, .4, .12, .04); } });
sound('cheer', 1.2, a => { for (let i = 0; i < 10; i++) { tone(a, i * .035, .8, 160 + i * 23, .12, 1, 400 + i * 31); noise(a, i * .08, .1, .5, .6); } });
sound('birds', 4, a => { for (const at of [0, .22, 1.65, 1.9, 3.1]) tone(a, at, .17, 2400, .11, .25, 3900); });
sound('countdown', .16, a => tone(a, 0, .14, 660, .5, .25));
sound('go', .45, a => { noise(a, 0, .4, 1.2, .25); tone(a, .02, .35, 880, .45, .4, 1320); });
const phrases: Record<string, [number, number[]]> = { newBest: [1.25, [72, 76, 79, 84]], gameOver: [2, [67, 64, 60, 48]], roundWin: [2.5, [60, 64, 67, 72, 79]], matchWin: [5, [60, 64, 67, 72, 67, 72, 76, 79, 84]] };
for (const [name, [length, notes]] of Object.entries(phrases)) sound(name, length, a => notes.forEach((n, i) => { const at = i * (length - .7) / notes.length; tone(a, at, .7, hz(n), .4, .7); tone(a, at, .6, hz(n - 12), .2, .2); }));
for (const [name, f, end] of [['click', 700, 450], ['back', 550, 250], ['toggle', 800, 1100], ['respawn', 250, 900], ['heartLost', 500, 170]] as const)
  sound(name, .2, a => tone(a, 0, .18, f, .4, .4, end));
for (const name of ['open', 'close']) sound(name, .2, a => { noise(a, 0, .18, .7, .18); tone(a, 0, .18, name === 'open' ? 350 : 600, .18, .1, name === 'open' ? 600 : 250); });
for (let animal = 0; animal < 6; animal++) sound(`grunt${animal}`, .3, a => {
  const pitches = [480, 120, 530, 340, 95, 650];
  for (let i = 0; i < (animal === 1 || animal === 4 ? 3 : 2); i++) tone(a, i * .07, .14, pitches[animal]!, .35, 1, pitches[animal]! * (animal === 5 ? .55 : .8));
});
// Import preparation is separate from runtime. Downloads are hash-pinned and cached outside Git.
const imported = spawnSync('python', ['art/import_audio.py', ffmpeg!, String(rate), String(SOUND.MENU_BPM), String(SOUND.GAME_BPM), String(SOUND.MUSIC_BARS)], { stdio: 'inherit' });
if (imported.status !== 0) throw new Error('CC0 source preparation failed');
function pcm(name: string): Samples {
  const bytes = readFileSync(`tmp/audio-import/${name}.pcm`);
  return Float32Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
}
for (const name of ['click', 'back', 'toggle', 'open', 'close', 'punch', 'hit', 'tock', 'log']) sounds[name] = pcm(name);
const tracks: Record<string, Samples> = {};
for (const name of ['menu', 'meadow', 'autumn', 'snow', 'nightCity']) {
  const source = pcm(name), bpm = name === 'menu' ? SOUND.MENU_BPM : SOUND.GAME_BPM;
  const a = buffer(SOUND.MUSIC_BARS * 4 * 60 / bpm);
  // Repeat the complete four-bar title phrase; other selections are eight bars.
  const phrase = Math.round((name === 'menu' ? 16 : 32) * 60 / bpm * rate);
  for (let i = 0; i < a.length; i++) a[i] = source[Math.min(i % phrase, source.length - 1)]!;
  // Five-millisecond boundary ramps remove codec/transient clicks without adding a silent gap.
  const edge = Math.round(rate * .005);
  for (let offset = 0; offset < a.length; offset += phrase) {
    const end = Math.min(a.length, offset + phrase);
    for (let i = 0; i < edge; i++) { a[offset + i]! *= i / edge; a[end - 1 - i]! *= i / edge; }
  }
  tracks[name] = a;
}
mkdirSync('tmp/audio', { recursive: true }); mkdirSync('client/public/sfx', { recursive: true }); mkdirSync('client/public/music', { recursive: true });
function wav(path: string, samples: Samples) {
  const b = Buffer.alloc(44 + samples.length * 2); b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 28000), 44 + i * 2)); writeFileSync(path, b);
}
function pack(values: Record<string, Samples>, name: string, loop: boolean) {
  let offset = 0; const sprite: Record<string, [number, number, boolean]> = {}, gap = Math.round(rate * SOUND.SPRITE_GAP_S);
  const samples = new Float32Array(Object.values(values).reduce((n, a) => n + a.length + gap, 0));
  for (const [key, a] of Object.entries(values)) { samples.set(a, offset); sprite[key] = [offset / rate * 1000, a.length / rate * 1000, loop]; offset += a.length + gap; }
  wav(`tmp/audio/${name}.wav`, samples); return sprite;
}
const manifest = { sfx: pack(sounds, 'sfx', false), music: pack(tracks, 'music', true) };
function encode(input: string, output: string, args: string[]) { const result = spawnSync(ffmpeg!, ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-map_metadata', '-1', ...args, output], { stdio: 'inherit' }); if (result.status !== 0) throw new Error(`Encoding failed: ${output}`); }
encode('tmp/audio/sfx.wav', 'client/public/sfx/brawl.mp3', ['-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k']);
encode('tmp/audio/music.wav', 'client/public/music/brawl.ogg', ['-codec:a', 'libvorbis', '-q:a', '3']);
encode('tmp/audio/music.wav', 'client/public/music/brawl.m4a', ['-codec:a', 'aac', '-b:a', '96k']);
writeFileSync('client/src/game/audio-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${Object.keys(sounds).length} CC0 sound sprites and ${Object.keys(tracks).length} OpenGameArt eight-bar music edits.`);
