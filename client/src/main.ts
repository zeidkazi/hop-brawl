import { gsap } from 'gsap';
import { VIEW } from '../../shared/config';
import { GameRenderer } from './game/renderer';
import { preloadFonts } from './ui/fonts';
import { Screens } from './ui/screens';
import './ui/styles.css';

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#ui-root')!;
  const loading = document.querySelector<HTMLElement>('#loading')!;
  const label = loading.querySelector('p')!;
  const progress = loading.querySelector('progress')!;
  const bounce = gsap.to(loading.querySelector('.loading-box'), { y: -VIEW.BUTTON_PRESS_PX * 3,
    duration: VIEW.IDLE_PERIOD_S / 2, repeat: -1, yoyo: true, ease: 'power1.out' });
  const update = (value: number): void => { progress.value = value; label.textContent = `${VIEW.LOADING_LABEL} ${value}%`; };
  root.style.setProperty('--flip-columns', String(VIEW.TILE_FLIP_COLUMNS));
  root.style.setProperty('--flip-rows', String(VIEW.TILE_FLIP_ROWS));
  try {
    const game = new GameRenderer(document.querySelector<HTMLCanvasElement>('#game-canvas')!);
    update(10);
    await Promise.all([preloadFonts().then(() => update(40)), game.warmup()]);
    update(100);
    const screens = new Screens(root, game);
    game.start();
    bounce.kill(); loading.hidden = true;
    if (new URL(location.href).searchParams.get('debug') === '1') {
      const { setupDebug } = await import('./game/debug');
      setupDebug(game, screens);
    }
  } catch (error) {
    bounce.kill(); progress.hidden = true;
    label.textContent = error instanceof Error && error.message === 'WEBGL_UNSUPPORTED'
      ? 'Hop Brawl needs a browser with 3D graphics (WebGL2). Try the latest Chrome, Safari or Firefox.'
      : 'Could not load Hop Brawl. Please refresh to try again.';
    console.error(error);
  }
}
void boot();
