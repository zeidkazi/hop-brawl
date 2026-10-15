import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2] ?? 'before', dir = 'output/playwright/feel';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('hop-brawl-settings', JSON.stringify({ name: 'Profile', animal: 2, music: .35, sfx: .8 })));
  await page.goto('http://localhost:5173/?debug=1'); await page.waitForFunction(() => !!window.__HOP_DEBUG__);
  await page.getByRole('button', { name: 'SOLO', exact: true }).click();
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
  await page.evaluate(() => {
    const solo = window.__HOP_DEBUG__.solo, game = solo.game, move = solo.movement;
    // Same deterministic rendered world and safe row in both runs. Gameplay/input/audio remain active.
    game.world.reset(1337); move.x = move.fromX = move.toX = 4; move.z = move.fromZ = move.toZ = 4;
    move.externalCamera = true; move.belowScreen = () => false;
    if (solo.pacing) {
      // Keep this lateral-hop fixture comparable after Solo's nine-second idle rule was added.
      const update = solo.pacing.update.bind(solo.pacing);
      solo.pacing.update = (time,z,first) => { update(time,z,first); solo.pacing.camZ = 0; solo.pacing.warning = solo.pacing.expired = false; };
    }
    game.quality.choice = 'high'; game.quality.tier = 'medium'; game.quality.resolution = 1; game.applyQuality();
    game.onFrame = null;
  });
  await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,disabled-by-default-devtools.timeline', transferMode: 'ReturnAsStream' });
  await page.bringToFront();
  await page.evaluate(() => { const s = window.__HOP_DEBUG__.solo; if (s.phase === 'paused') s.resume(); });
  await page.waitForFunction(() => window.__HOP_DEBUG__.solo.phase === 'playing');
  const frames = await page.evaluate(() => new Promise(resolve => {
    const solo = window.__HOP_DEBUG__.solo, game = solo.game, stamps = new Float64Array(2000), costs = new Float64Array(2000);
    let count = 0, began = performance.now(), next = began, side = false;
    game.onFrame = now => {
      if (now >= next) { window.dispatchEvent(new KeyboardEvent('keydown', { key: side ? 'ArrowLeft' : 'ArrowRight' })); side = !side; next = now + 240; }
      stamps[count] = now; costs[count++] = performance.now() - now;
      if (now - began < 12000) return;
      game.onFrame = null;
      const deltas = Array.from(stamps.slice(1, count), (t, i) => t - stamps[i]).sort((a,b) => a-b);
      resolve({ frames: count, p95: deltas[Math.ceil(deltas.length*.95)-1], worst: deltas.at(-1), over50: deltas.filter(t=>t>50).length,
        fps: (count-1)*1000/(stamps[count-1]-stamps[0]), calls: game.metrics.calls, triangles: game.metrics.triangles, hops: solo.movement.hops,
        tier: game.quality.tier, pixelRatio: game.renderer.getPixelRatio(), phase: solo.phase });
    };
  }));
  const profile = await cdp.send('Profiler.stop');
  const complete = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve)); await cdp.send('Tracing.end');
  const { stream } = await complete; let trace = '';
  while (true) { const part = await cdp.send('IO.read', { handle: stream }); trace += part.data; if(part.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  await writeFile(`${dir}/${label}-trace.json`, trace); await writeFile(`${dir}/${label}-cpu.json`, JSON.stringify(profile));
  // Heap snapshots plus allocation sampling: capture retained objects and transient allocation sites.
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
  const heapBefore = await cdp.send('Runtime.getHeapUsage');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 });
  await page.waitForTimeout(5000); const allocations = await cdp.send('HeapProfiler.stopSampling');
  await cdp.send('HeapProfiler.collectGarbage'); const heapAfter = await cdp.send('Runtime.getHeapUsage');
  let heap = ''; cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => heap += chunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await writeFile(`${dir}/${label}.heapsnapshot`, heap); await writeFile(`${dir}/${label}-allocations.json`, JSON.stringify(allocations));
  const nodes = new Map(profile.profile.nodes.map(n=>[n.id,n])); const totals = new Map();
  profile.profile.samples?.forEach((id,i) => { const n = nodes.get(id), key = `${n.callFrame.functionName} ${n.callFrame.url}:${n.callFrame.lineNumber+1}`; totals.set(key,(totals.get(key)||0)+(profile.profile.timeDeltas?.[i]||0)/1000); });
  const top = [...totals].sort((a,b)=>b[1]-a[1]).slice(0,35);
  const result = { label, cpuThrottle:4, viewport:[390,844], ...frames, heapBefore, heapAfter, top, errors };
  if (frames.phase !== 'playing' || frames.hops < 30) throw new Error('Invalid active-play sample: ' + JSON.stringify(frames));
  await writeFile(`${dir}/${label}-performance.json`, JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
