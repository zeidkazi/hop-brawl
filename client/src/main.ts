import { VIEW } from '../../shared/config';
import { GameRenderer } from './game/renderer';
import { preloadFonts } from './ui/fonts';
import { Screens } from './ui/screens';
import { Loading } from './ui/loading';
import { downloads } from './ui/downloads';
import { registerAudio } from './game/audio';
import styles from './ui/styles.css?inline';

// Keep the game stylesheet out of index.html's render-blocking critical path.
document.head.append(Object.assign(document.createElement('style'), { textContent: styles }));

const root = document.querySelector<HTMLElement>('#ui-root')!;
const loading = new Loading();
root.inert = true;
root.style.setProperty('--flip-columns', String(VIEW.TILE_FLIP_COLUMNS));
root.style.setProperty('--flip-rows', String(VIEW.TILE_FLIP_ROWS));
let game: GameRenderer | undefined;
registerAudio();
async function boot(): Promise<void> {
  try {
    performance.mark('hop-boot-start');
    const transfer = downloads.load();
    // The renderer can fail synchronously before Promise.all attaches its handlers.
    void transfer.catch(() => {});
    game ??= new GameRenderer(document.querySelector<HTMLCanvasElement>('#game-canvas')!);
    performance.mark('hop-renderer-ready');
    await Promise.all([transfer, preloadFonts(), game.warmup(), game.home.sound.load()]);
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
