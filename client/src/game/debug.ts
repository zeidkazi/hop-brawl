import GUI from 'lil-gui';
import Stats from 'stats.js';
import { CONFIG, VIEW } from '../../../shared/config';
import { STATIONS } from './camera';
import type { Station } from './camera';
import type { GameRenderer } from './renderer';
import type { GraphicsChoice } from './quality';
import type { Screens } from '../ui/screens';

export interface DebugApi {
  snapshot(): {
    frames: number; calls: number; triangles: number; geometries: number; textures: number; delta: number;
    tier: string; choice: string; resolution: number; pixelRatio: number; p95: number; worst: number;
    programs: number; rows: number; generatedRows: number; particles: number; station: Station; mobile: boolean;
  };
  station(value: Station): void;
  graphics(value: GraphicsChoice): void;
  scroll(value: number): void;
  flip(): void;
  toast(text: string): void;
  particles(): void;
}
declare global { interface Window { __HOP_DEBUG__?: DebugApi } }

/** Imported only for ?debug=1; production navigation never downloads the tools. */
export function setupDebug(game: GameRenderer, screens: Screens): void {
  const stats = new Stats(); stats.showPanel(0); document.body.append(stats.dom);
  const readout = document.createElement('pre'); readout.className = 'debug-metrics'; document.body.append(readout);
  const api: DebugApi = {
    snapshot: () => ({ ...game.metrics, tier: game.quality.tier, choice: game.quality.choice,
      resolution: game.quality.resolution, pixelRatio: game.renderer.getPixelRatio(), p95: game.quality.frames.p95,
      worst: game.quality.frames.worst, programs: game.renderer.info.programs?.length ?? 0,
      rows: game.world.rows.length, generatedRows: game.world.generatedRows,
      particles: game.particles.pool.count, station: game.rig.station, mobile: game.quality.mobile }),
    station: value => game.go(value),
    graphics: value => game.setGraphics(value),
    scroll: value => { game.rig.targetCamZ = value; },
    flip: () => screens.motion.tileFlip(() => { game.world.reset(CONFIG.HOME_DIORAMA_SEED); game.rig.targetCamZ = 0; }),
    toast: text => screens.motion.toast(text),
    particles: () => game.particles.burst(game.world.animalX, game.world.animalZ),
  };
  window.__HOP_DEBUG__ = api;
  const gui = new GUI({ title: 'Hop Brawl · debug' });
  const controls = { station: 'home', graphics: game.quality.choice, camZ: 0, menus: true,
    'Tile flip': api.flip, 'Dust burst': api.particles, Toast: () => api.toast('HOP!') };
  gui.add(controls, 'station', STATIONS).onChange((value: Station) => api.station(value));
  gui.add(controls, 'graphics', ['auto', 'high', 'low']).onChange((value: GraphicsChoice) => api.graphics(value));
  gui.add(controls, 'camZ', 0, CONFIG.BIOME_LENGTH_ROWS * 2, 1).onChange((value: number) => api.scroll(value));
  gui.add(controls, 'menus').onChange((value: boolean) => { screens.root.hidden = !value; });
  gui.add(controls, 'Tile flip'); gui.add(controls, 'Dust burst'); gui.add(controls, 'Toast');
  gui.close();
  let nextReadout = 0;
  game.onFrame = now => {
    stats.update();
    if (now < nextReadout) return;
    nextReadout = now + VIEW.DEBUG_UPDATE_MS;
    readout.textContent = `${game.quality.tier.toUpperCase()} · ${(game.quality.resolution * 100).toFixed(0)}% resolution\n`
      + `p95 ${game.quality.frames.p95.toFixed(1)}ms · max ${game.quality.frames.worst.toFixed(1)}ms\n`
      + `${game.metrics.calls} calls · ${game.metrics.triangles} triangles\n`
      + `${game.metrics.geometries} geometries · ${game.world.rows.length} row slots\n`
      + `${game.particles.pool.count}/${VIEW.PARTICLE_POOL} particles`;
  };
}
