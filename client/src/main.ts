import { VIEW } from '../../shared/config';
import { GameRenderer } from './game/renderer';
import { preloadFonts } from './ui/fonts';
import { Screens } from './ui/screens';
import { Loading } from './ui/loading';
import './ui/styles.css';

const root = document.querySelector<HTMLElement>('#ui-root')!;
const loading = new Loading();
root.inert = true;
root.style.setProperty('--flip-columns', String(VIEW.TILE_FLIP_COLUMNS));
root.style.setProperty('--flip-rows', String(VIEW.TILE_FLIP_ROWS));
let game: GameRenderer | undefined;
async function boot(): Promise<void> {
  try {
    game ??= new GameRenderer(document.querySelector<HTMLCanvasElement>('#game-canvas')!);
    await Promise.all([preloadFonts(), game.warmup()]);
    const screens = new Screens(root, game);
    game.home.logo.visible = false;
    game.start(false);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await loading.finish();
    game.home.logo.visible = true; game.home.playIntro(); root.inert = false;
    if (new URL(location.href).searchParams.get('debug') === '1') {
      const { setupDebug } = await import('./game/debug');
      setupDebug(game, screens);
    }
  } catch (error) {
    console.warn('Loading failed:', error);
    loading.error(boot, error instanceof Error && error.message === 'WEBGL_UNSUPPORTED'
      ? 'Hop Brawl needs a browser with 3D graphics (WebGL2). Try the latest Chrome, Safari or Firefox.'
      : undefined);
  }
}
void boot();
