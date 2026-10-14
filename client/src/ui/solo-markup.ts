export const SOLO_MARKUP = `
<section id="solo" class="screen solo-hud" aria-label="Solo run" hidden>
  <div class="solo-score"><strong id="solo-distance">0</strong><span id="solo-best">BEST 0</span></div>
  <button class="icon-button solo-menu" data-solo="pause" aria-label="Pause Solo">⚙</button>
  <div id="solo-heart" aria-label="1 heart">♥</div>
  <div id="solo-countdown" class="solo-slam" role="status"></div>
  <div id="solo-cause" class="solo-slam" role="status" hidden></div>
  <div id="solo-danger" aria-hidden="true"></div>
  <div id="solo-you" class="world-label">YOU ▼</div><div id="solo-name" class="world-label"></div>
  <div id="solo-best-flag" class="world-label best-flag" hidden>BEST ⚑</div>
</section>
<section id="pause" class="screen modal" aria-labelledby="pause-title" hidden><div class="panel">
  <h2 id="pause-title">PAUSED</h2><button class="yellow" data-solo="resume">Resume</button>
  <button data-solo="restart">Restart</button><button data-screen="settings">Settings</button>
  <button class="text-button" data-solo="quit">Quit to menu</button>
</div></section>
<section id="soloEnd" class="screen modal" aria-labelledby="solo-end-title" hidden><div class="panel solo-result">
  <h2 id="solo-end-title">SPLASH!</h2><p id="solo-final-score">SCORE 0</p><p id="solo-final-best">BEST 0</p>
  <strong id="solo-new-best" hidden>NEW BEST!</strong>
  <button class="yellow" data-solo="restart">RETRY</button><button class="text-button" data-solo="quit">Menu</button>
</div></section>`;
