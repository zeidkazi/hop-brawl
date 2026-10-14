import { gsap } from 'gsap';
import { ANIMALS, VIEW } from '../../../shared/config';
import type { GameRenderer } from '../game/renderer';
import { Motion } from './motion';
import { readPreferences, savePreferences } from './settings';
import { Solo } from '../game/solo';
import { SOLO_MARKUP } from './solo-markup';
import { ROOM_MARKUP } from './room-markup';
import { Versus } from '../game/versus';

type Screen = 'home' | 'friends' | 'settings' | 'how' | 'credits' | 'name' | 'solo' | 'pause' | 'soloEnd' | 'lobby' | 'versus' | 'roundEnd' | 'matchEnd';
const SCREENS: readonly Screen[] = ['home', 'friends', 'settings', 'how', 'credits', 'name', 'solo', 'pause', 'soloEnd', 'lobby', 'versus', 'roundEnd', 'matchEnd'];
const CARDS = [
  ['Hop forward. Survive.', "Tap or swipe on phone · Arrow keys / WASD on PC. Dodge cars and trains, ride logs, and don't fall off the bottom of the screen."],
  ['Shove to win.', "Hop into your opponent to shove them one tile — into traffic, if you're lucky. Shoving has a short cooldown."],
  ['Last one hopping.', "You have 2 hearts per round. Last one standing wins the round. First to 2 rounds wins. Share a room code with up to three friends, or practice in Solo."],
] as const;

// Denied access to the localStorage getter is handled as well as failed reads/writes.
const storage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};

export class Screens {
  readonly preferences = readPreferences(storage, matchMedia('(prefers-reduced-motion: reduce)').matches);
  readonly motion: Motion;
  readonly solo: Solo;
  readonly versus: Versus;
  private screen: Screen = 'home';
  private readonly panels: Record<Screen, HTMLElement>;
  private readonly names: HTMLInputElement[];
  private readonly animalLabel: HTMLElement;
  private card = 0;
  private carousel: gsap.core.Timeline | null = null;
  private pointerX = 0;
  private afterName: Screen | null = null;

  constructor(readonly root: HTMLElement, readonly game: GameRenderer) {
    // Static trusted markup only; persisted names and URL values use value/textContent.
    root.innerHTML = `
      <section id="home" class="screen home" aria-label="Home" hidden>
        <h1 class="sr-only">Hop Brawl</h1>
        <div class="home-toolbar">
          <button class="name-pill" data-screen="name" aria-label="Edit name"><span aria-hidden="true">✎</span> <span id="name-caption"></span></button>
          <nav aria-label="Help and preferences">
            <button class="icon-button" data-screen="how" aria-label="How to Play">?</button>
            <button class="icon-button" data-screen="settings" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 2-.7 3-2 .9-2.7-.9-2 3.5L5 10v3l-2.4 1.6 2 3.5 2.7-.9 2 .9.7 3h4l.7-3 2-.9 2.7.9 2-3.5L19 13v-3l2.4-1.5-2-3.5-2.7.9-2-.9L14 2Z"/><circle cx="12" cy="11.5" r="3"/></svg></button>
          </nav>
        </div>
        <div class="scene-controls" aria-label="Choose your animal">
          <button class="scene-hit" data-animal="-1" aria-label="Previous animal"></button>
          <button class="scene-hit" data-animal="1" aria-label="Next animal"></button>
          <button class="scene-hit animal-hit" data-combo aria-label="Throw boxing combo"></button>
          <strong id="animal-label" class="animal-name" aria-live="polite"></strong>
        </div>
        <div class="home-actions">
          <div class="mode-buttons">
            <button class="yellow primary" data-mode="play">PLAY</button>
            <button class="green" data-screen="friends">FRIENDS</button>
            <button class="blue" data-mode="solo" aria-label="SOLO">SOLO</button>
          </div>
        </div>
      </section>
      <section id="name" class="screen modal name-editor" aria-labelledby="name-title" hidden>
        <form class="panel"><h2 id="name-title">YOUR NAME</h2>
          <label class="sr-only" for="home-name">Your name</label>
          <input id="home-name" class="name" autocomplete="nickname" placeholder="Your name" maxlength="${VIEW.NAME_MAX_LENGTH}">
          <button class="yellow" type="submit">Done</button>
        </form>
      </section>
      <section id="friends" class="screen modal" aria-labelledby="friends-title" hidden>
        <div class="panel"><h2 id="friends-title">PLAY WITH FRIENDS</h2>
          <button class="green" data-room="create">Create Room</button><p class="divider">or join</p>
          <div class="room-code" aria-label="Room code">${Array.from({ length: 4 }, (_, i) => `<input aria-label="Room code letter ${i + 1}" maxlength="1" autocomplete="off" autocapitalize="characters" inputmode="text">`).join('')}</div>
          <button class="yellow" data-room="join">Join</button><p id="room-error" role="status"></p><button class="text-button" data-back>Back</button>
        </div>
      </section>
      <section id="settings" class="screen modal" aria-labelledby="settings-title" hidden>
        <div class="panel"><h2 id="settings-title">SETTINGS</h2>
          <label>Music volume<input id="music" type="range" min="0" max="1" step="0.01"></label>
          <label>SFX volume<input id="sfx" type="range" min="0" max="1" step="0.01"></label>
          <label class="check">Haptics<input id="haptics" type="checkbox"></label>
          <label class="check">Reduce motion<input id="reducedMotion" type="checkbox"></label>
          <label>Graphics<select id="graphics"><option value="auto">Auto</option><option value="high">High</option><option value="low">Low</option></select></label>
          <label>Name<input id="settings-name" class="name" placeholder="Your name" autocomplete="nickname" maxlength="${VIEW.NAME_MAX_LENGTH}"></label>
          <button class="text-button" data-screen="credits">Credits</button>
          <button class="yellow" data-back>Back</button>
        </div>
      </section>
      <section id="how" class="screen modal" aria-labelledby="how-title" hidden>
        <div class="panel"><h2 id="how-title">HOW TO PLAY</h2><div id="how-card" tabindex="0"><div class="card-blocks" aria-hidden="true">■ → ■</div><h3></h3><p></p></div>
          <div class="card-nav"><button data-card="-1" aria-label="Previous card">‹</button><span id="card-page"></span><button data-card="1" aria-label="Next card">›</button></div>
          <button class="yellow" data-back>Got it!</button>
        </div>
      </section>
      <section id="credits" class="screen modal" aria-labelledby="credits-title" hidden>
        <div class="panel"><h2 id="credits-title">CREDITS</h2><p>Original Hop Brawl models and scenery — CC0.</p>
          <p>Lilita One — Juan Montoreano.<br><a href="/licenses/lilita-one.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a></p>
          <p>Nunito — The Nunito Project Authors.<br><a href="/licenses/nunito.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a></p>
          <button class="yellow" data-back>Back</button>
        </div>
      </section>
      ${SOLO_MARKUP}
      ${ROOM_MARKUP}
      <div id="tile-cover" aria-hidden="true" hidden></div><div id="toasts" role="status" aria-live="polite"></div>`;
    this.panels = Object.fromEntries(SCREENS.map(key => [key, root.querySelector<HTMLElement>(`#${key}`)!])) as Record<Screen, HTMLElement>;
    this.motion = new Motion(Object.values(this.panels), root.querySelector('#tile-cover')!, root.querySelector('#toasts')!);
    this.solo = new Solo(root, game, this.preferences, this.motion, screen => {
      history.replaceState({ screen }, '', '/'); this.show(screen);
    });
    this.versus = new Versus(root, game, this.preferences, this.motion, screen => {
      history.replaceState({ screen }, '', this.versus.active ? `?room=${this.versus.client.state!.code}` : '/'); this.show(screen);
    });
    game.onDiscontinuity = () => {
      this.solo.pause(); this.carousel?.progress(1); this.motion.settle();
    };
    this.names = Array.from(root.querySelectorAll<HTMLInputElement>('.name'));
    this.animalLabel = root.querySelector('#animal-label')!;
    this.names.forEach(input => {
      input.value = this.preferences.name;
      input.addEventListener('input', () => {
        this.preferences.name = input.value.slice(0, VIEW.NAME_MAX_LENGTH);
        for (const other of this.names) if (other !== input) other.value = this.preferences.name;
        this.updateName();
        this.save();
      });
    });
    for (const key of ['music', 'sfx', 'haptics', 'reducedMotion'] as const) {
      const input = root.querySelector<HTMLInputElement>(`#${key}`)!;
      if (key === 'music' || key === 'sfx') input.value = String(this.preferences[key]);
      else input.checked = this.preferences[key];
      input.addEventListener('input', () => {
        if (key === 'music' || key === 'sfx') this.preferences[key] = Number(input.value);
        else this.preferences[key] = input.checked;
        this.applyPreferences(); this.save();
      });
    }
    const graphics = root.querySelector<HTMLSelectElement>('#graphics')!;
    graphics.value = this.preferences.graphics;
    graphics.addEventListener('change', () => {
      this.preferences.graphics = graphics.value as typeof this.preferences.graphics;
      this.game.setGraphics(this.preferences.graphics); this.save();
    });
    root.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button) return;
      this.game.home.sound.unlock();
      if (button.dataset.screen) this.navigate(button.dataset.screen as Screen);
      else if (button.dataset.mode === 'play') this.navigate('friends');
      else if (button.dataset.mode === 'solo') this.navigate('solo');
      else if (button.hasAttribute('data-back')) this.back();
      else if (button.dataset.animal) this.changeAnimal(Number(button.dataset.animal));
      else if (button.hasAttribute('data-combo')) this.game.home.move('combo');
      else if (button.dataset.card) this.changeCard(Number(button.dataset.card));
    });
    const hits = root.querySelectorAll<HTMLElement>('.scene-hit');
    this.game.home.onTargets = points => {
      for (let i = 0; i < hits.length; i++) {
        hits[i]!.style.left = `${points[i * 2]! * 100}%`;
        hits[i]!.style.top = `${points[i * 2 + 1]! * 100}%`;
      }
      this.animalLabel.style.left = `${points[4]! * 100}%`;
      this.animalLabel.style.top = `calc(${points[5]! * 100}% + 70px)`;
    };
    this.game.home.layout(this.game.rig.camera);
    root.querySelector('#name form')!.addEventListener('submit', event => {
      event.preventDefault(); this.preferences.name = this.preferences.name.trim();
      if (this.afterName && !this.preferences.name) { this.focusName(); return; }
      this.names.forEach(input => { input.value = this.preferences.name; }); this.updateName(); this.save();
      if (this.afterName) {
        const next = this.afterName; this.afterName = null;
        history.replaceState({ screen: next }, '', location.href); this.show(next);
      } else this.back();
    });
    this.swipe(root.querySelector('.animal-hit')!, direction => this.changeAnimal(direction));
    this.swipe(root.querySelector('#how-card')!, direction => this.changeCard(direction));
    this.setupRoomCode();
    window.addEventListener('popstate', () => this.show(this.route()));
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.screen !== 'home') { this.back(); return; }
      if (this.screen !== 'home' || event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.changeAnimal(event.key === 'ArrowRight' ? 1 : -1); }
      else if (event.key.toLowerCase() === 'f') this.navigate('friends');
      else if (event.key.toLowerCase() === 's') root.querySelector<HTMLButtonElement>('[data-mode="solo"]')!.click();
      else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) root.querySelector<HTMLButtonElement>('[data-mode="play"]')!.click();
    });
    this.applyPreferences(); this.game.setGraphics(this.preferences.graphics);
    this.game.world.animal = this.preferences.animal;
    this.updateAnimal(); this.updateName(); this.game.home.select(this.preferences.animal); this.changeCard(0);
    let initial: Screen = new URL(location.href).searchParams.has('room') ? 'friends' : this.route();
    if (initial === 'friends' && !this.preferences.name.trim()) { this.afterName = 'friends'; initial = 'name'; }
    history.replaceState({ screen: initial }, '', location.href);
    this.show(initial);
  }

  private route(): Screen {
    const value: unknown = history.state?.screen;
    if (['lobby', 'versus', 'roundEnd', 'matchEnd'].includes(String(value)) && !this.versus.active) return 'friends';
    return SCREENS.includes(value as Screen) ? value as Screen : new URL(location.href).searchParams.has('room') ? 'friends' : 'home';
  }
  navigate(screen: Screen): void {
    if ((screen === 'friends' || screen === 'solo') && !this.preferences.name.trim()) { this.afterName = screen; screen = 'name'; }
    if (screen === this.screen) return;
    history.pushState({ screen }, '', screen === 'friends' ? location.href : '/');
    this.show(screen);
    if (screen === 'name' && this.afterName) this.focusName();
  }
  private back(): void {
    // Deep-linked sheets have no in-app entry behind them.
    if (new URL(location.href).searchParams.has('room')) {
      history.replaceState({ screen: 'home' }, '', '/'); this.show('home');
    } else history.back();
  }
  private show(screen: Screen): void {
    if (this.versus.active && !['lobby', 'versus', 'roundEnd', 'matchEnd'].includes(screen)) { this.versus.leave(screen === 'home' ? 'home' : 'friends'); return; }
    if (screen === 'solo' && !this.solo.active) { this.solo.start(); return; }
    if (screen === 'home' && this.solo.active) { this.solo.quit(); return; }
    if (screen !== 'name') this.afterName = null;
    this.screen = screen;
    this.root.dataset.screen = screen;
    this.motion.show(this.panels[screen]);
    if (!this.solo.active && !this.versus.active && this.game.rig.station !== 'home') this.game.go('home');
    this.panels[screen].querySelector<HTMLElement>('input, button, a')?.focus({ preventScroll: true });
  }
  private save(): void { savePreferences(storage, this.preferences); }
  private focusName(): void {
    const input = this.names[0]!; input.focus({ preventScroll: true });
    if (!this.preferences.reducedMotion) gsap.fromTo(input, { x: -VIEW.NAME_SHAKE_PX }, { x: VIEW.NAME_SHAKE_PX, repeat: 3, yoyo: true, duration: VIEW.NAME_SHAKE_MS / 1000, onComplete: () => { gsap.set(input, { x: 0 }); } });
  }
  private applyPreferences(): void {
    this.motion.reduced = this.preferences.reducedMotion;
    this.game.setReducedMotion(this.preferences.reducedMotion);
    this.game.home.sound.volume = this.preferences.sfx;
  }
  private updateAnimal(): void { this.animalLabel.textContent = ANIMALS[this.preferences.animal]!; }
  private updateName(): void { this.root.querySelector('#name-caption')!.textContent = this.preferences.name.trim() || 'Tap to set name'; }
  private changeAnimal(direction: number): void {
    // Anchor a new gesture to input time, including the first gesture after startup warm-up.
    // An old GSAP ticker time could otherwise consume the outgoing half before its first paint.
    gsap.ticker.tick();
    this.preferences.animal = (this.preferences.animal + direction + ANIMALS.length) % ANIMALS.length;
    this.save(); this.updateAnimal(); this.carousel?.kill();
    const home = this.game.home;
    if (this.preferences.reducedMotion) {
      this.game.world.animal = this.preferences.animal; home.select(this.preferences.animal); home.swap = 0; home.landed(); return;
    }
    this.carousel = gsap.timeline().to(home, { swap: -direction * VIEW.CAROUSEL_TRAVEL, duration: VIEW.CAROUSEL_MS / 2000, ease: 'power2.in', overwrite: 'auto' })
      .call(() => { this.game.world.animal = this.preferences.animal; home.select(this.preferences.animal); home.swap = direction * VIEW.CAROUSEL_TRAVEL; })
      .to(home, { swap: 0, duration: VIEW.CAROUSEL_MS / 2000, ease: 'power2.out' }).call(() => home.landed());
  }
  private changeCard(direction: number): void {
    this.card = (this.card + direction + CARDS.length) % CARDS.length;
    const data = CARDS[this.card]!;
    this.root.querySelector('#how-card h3')!.textContent = data[0];
    this.root.querySelector('#how-card p')!.textContent = data[1];
    this.root.querySelector('#card-page')!.textContent = `${this.card + 1} / ${CARDS.length}`;
  }
  private swipe(element: HTMLElement, change: (direction: number) => void): void {
    let swiped = false;
    element.addEventListener('pointerdown', event => { this.pointerX = event.clientX; swiped = false; });
    element.addEventListener('pointerup', event => { const dx = event.clientX - this.pointerX; if (Math.abs(dx) >= VIEW.CAROUSEL_SWIPE_PX) { swiped = true; change(dx < 0 ? 1 : -1); } });
    element.addEventListener('click', event => { if (swiped) { event.preventDefault(); event.stopPropagation(); swiped = false; } });
    element.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); change(event.key === 'ArrowRight' ? 1 : -1); }
    });
  }
  private setupRoomCode(): void {
    const inputs = Array.from(this.root.querySelectorAll<HTMLInputElement>('.room-code input'));
    const fill = (value: string): void => {
      const code = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, inputs.length);
      inputs.forEach((input, i) => { input.value = code[i] ?? ''; });
    };
    fill(new URL(location.href).searchParams.get('room') ?? '');
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1); if (input.value) inputs[index + 1]?.focus(); });
      input.addEventListener('keydown', event => { if (event.key === 'Backspace' && !input.value) inputs[index - 1]?.focus(); });
      input.addEventListener('paste', event => { event.preventDefault(); fill(event.clipboardData?.getData('text') ?? ''); inputs[inputs.length - 1]!.focus(); });
    });
  }
}
