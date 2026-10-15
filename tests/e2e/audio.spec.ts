import { expect, test } from '@playwright/test';
import manifest from '../../client/src/game/audio-manifest.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Audio', animal: 2, sfx: .8, music: .5, reducedMotion: true })));
  await page.goto('/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
});
test('predecodes silently, keeps menu playback continuous, honors mute and bounds warning bursts', async ({ page }) => {
  const initial = await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics);
  expect(initial.loaded).toBe(true); expect(initial.unlocked).toBe(false); expect(initial.voices).toBe(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.unlocked)).toBe(true);
  const id = await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.musicId);
  await page.keyboard.press('Escape'); await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.musicId)).toBe(id);
  const result = await page.evaluate(async () => {
    const sound = window.__HOP_DEBUG__!.solo.game.home.sound;
    await new Promise(resolve => setTimeout(resolve, 1300));
    const filter = Reflect.get(sound, 'filter') as BiquadFilterNode, ctx = filter.context as AudioContext;
    const analyser = ctx.createAnalyser(), silent = ctx.createGain(); silent.gain.value = 0;
    filter.connect(analyser); analyser.connect(silent); silent.connect(ctx.destination);
    const samples = new Float32Array(analyser.fftSize); let rms = 0;
    for (let i = 0; i < 5; i++) { await new Promise(resolve => setTimeout(resolve, 100)); analyser.getFloatTimeDomainData(samples);
      rms = Math.max(rms, Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)); }

    sound.gameplay(); sound.musicVolume = 0;
    const muted = Reflect.get(sound, 'music')._sounds.every((s: { _muted: boolean }) => s._muted);
    sound.musicVolume = .5;
    for (let i = 0; i < 40; i++) sound.play('bell', i % 2 ? -1 : 1);
    for (let i = 0; i < 40; i++) sound.loop(`stress-${i}`, 'car', 0, .1);
    const count = sound.diagnostics.voices;
    sound.volume = 0;
    await new Promise(resolve => setTimeout(resolve, 50));
    const zero = Reflect.get(sound, 'sfx')._sounds.every((s: { _node: GainNode }) => s._node.gain.value === 0);
    sound.resetRound(); sound.volume = .8;
    sound.muffle(true, true); await new Promise(resolve => setTimeout(resolve, 300));
    const lowpass = sound.diagnostics.filterHz;
    sound.muffle(false); await new Promise(resolve => setTimeout(resolve, 300));
    const open = sound.diagnostics.filterHz;
    filter.disconnect(analyser); analyser.disconnect(); silent.disconnect();
    return { rms, muted, zero, count, lowpass, open };
  });
  console.log('AUDIO MIX', JSON.stringify(result));
  expect(result.rms).toBeGreaterThan(.001); expect(result.muted).toBe(true); expect(result.zero).toBe(true);
  expect(result.count).toBeLessThanOrEqual(16); expect(result.lowpass).toBeLessThan(750); expect(result.open).toBeGreaterThan(19000);
  console.log('AUDIO MIX', JSON.stringify(result));
});
test('all exported sprites decode with nonzero signal and exact musical loop boundaries', async ({ page }) => {
  test.setTimeout(60000);
  const result = await page.evaluate(async manifest => {
    const ctx = new AudioContext(), output: { file: string; channels: number; minRms: number; maxJoin: number }[] = [];
    for (const file of ['/sfx/brawl.mp3', '/music/brawl.ogg', '/music/brawl.m4a']) {
      const b = await ctx.decodeAudioData(await (await fetch(file)).arrayBuffer()), values = b.getChannelData(0);
      let minRms = 1, maxJoin = 0;
      for (const sprite of Object.values(file.includes('sfx') ? manifest.sfx : manifest.music)) {
        const start = Math.round(Number(sprite[0]) / 1000 * b.sampleRate), end = Math.round((Number(sprite[0]) + Number(sprite[1])) / 1000 * b.sampleRate);
        let sum = 0; for (let i = start; i < end; i++) sum += values[i]! ** 2;
        minRms = Math.min(minRms, Math.sqrt(sum / (end - start))); maxJoin = Math.max(maxJoin, Math.abs(values[start]! - values[end - 1]!));
      }
      output.push({ file, channels: b.numberOfChannels, minRms, maxJoin });
    }
    await ctx.close(); return output;
  }, manifest);
  for (const file of result) { expect(file.channels).toBe(1); expect(file.minRms).toBeGreaterThan(.005); expect(file.maxJoin).toBeLessThan(.09); }
  console.log('AUDIO DECODE', JSON.stringify(result));
});
test('Solo crosses to gameplay at HOP and filters music on pause and death', async ({ page }) => {
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('countdown');
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.track)).toBe('menu');
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.track)).toBe('meadow');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.paused)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.phase)).toBe('playing');
  await expect.poll(() => page.evaluate(() => window.__HOP_DEBUG__!.solo.movement.hopping)).toBe(false);
  await page.evaluate(() => { const solo = window.__HOP_DEBUG__!.solo; for (let i = 0; i < 20; i++) { const z = Math.floor(solo.movement.camZ) - i; if (solo.game.rig.screenY(solo.movement.x, z) >= 1.1) { solo.movement.z = z; break; } } });
  await expect(page.locator('#soloEnd')).toBeVisible();
  expect(await page.evaluate(() => window.__HOP_DEBUG__!.solo.game.home.sound.diagnostics.muffled)).toBe(true);
});
