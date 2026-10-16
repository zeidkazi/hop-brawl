import { ANIMALS, COLORS } from '../../../shared/config';

export const ROOM_MARKUP = `
<section id="lobby" class="screen room-lobby" aria-label="Room lobby" hidden>
  <div class="room-top"><strong>ROOM <span id="lobby-code"></span></strong><button data-room="copy">Copy link</button><button data-room="leave" class="text-button">Leave</button></div>
  <div class="room-panel panel"><h2>READY TO BRAWL?</h2><div id="lobby-players" class="lobby-players"></div>
  <div id="lobby-animals" class="lobby-animals" aria-label="Choose animal">${ANIMALS.map((a, i) => `<button data-room-animal="${i}">${a[0]!.toUpperCase() + a.slice(1)}</button>`).join('')}</div>
  <p id="lobby-status" role="status"></p><button class="yellow" data-room="start">START</button></div>
</section>
<section id="versus" class="screen room-game" aria-label="Multiplayer match" hidden>
  <div id="match-danger" aria-hidden="true"></div>
  <div class="room-top"><strong id="round-label">ROUND 1</strong><button class="text-button" data-room="leave">Leave</button></div>
  <div class="match-scores">${COLORS.players.map((color, i) => `<div id="match-player-${i}" style="--player:${color}" hidden><div class="card-animal"></div><div class="card-details"><strong></strong><div class="card-symbols"></div></div></div>`).join('')}</div>
  <div id="match-countdown" class="match-countdown" aria-live="polite"></div>
  <div id="match-status" class="match-status" role="status"></div>
  ${COLORS.players.map((color, i) => `<span id="match-name-${i}" class="match-name" style="--player:${color}" hidden></span>`).join('')}
</section>
<section id="roundEnd" class="screen modal room-result" aria-label="Round results" hidden>
  <div class="panel"><div class="result-banner"><div id="round-winner-animal"></div><h2 id="round-result-title"></h2><div id="round-winner-pips"></div></div><p id="round-result-score"></p><strong id="round-next"></strong></div>
</section>
<section id="matchEnd" class="screen modal room-result" aria-label="Match results" hidden>
  <div class="panel"><div class="result-banner"><div class="winner-shout">WINNER!</div><div id="match-winner-animal"></div><h2 id="match-result-title"></h2><div id="match-winner-pips"></div></div><p id="match-result-reason"></p><div id="match-result-score"></div>
  <button class="yellow" data-room="rematch">REMATCH</button><button class="green" data-room="lobby">Back to lobby</button><button class="green" data-quick="new" hidden>New opponent</button><button class="text-button" data-quick="menu" hidden>Menu</button><p id="match-host-note"></p><button class="text-button" data-room="leave">Leave</button></div>
</section>`;
