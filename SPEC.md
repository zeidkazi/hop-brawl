# HOP BRAWL — Complete Build Spec

> **For Codex — read first.**
> This document is the complete design. Implement it exactly; do not invent rules, screens, mechanics or copy.
> Every tunable number lives in `shared/config.ts` and is listed in §23. If something is genuinely ambiguous, choose the simplest option consistent with this spec and log it in `DECISIONS.md` (one line each).
> Work milestone by milestone (§21). Use the tools and skills in §22. Priorities: **P0** = required for submission, **P1** = required for a winning entry, **P2** = only if time remains.
> Top quality goals, in order: **(1) smooth, responsive controls and animation on phone and PC, (2) seamless multiplayer sync, (3) polish and clear guidance.**

---

## 1. Identity

- **Name:** Hop Brawl
- **Pitch:** A voxel road-crossing brawler. Hop through traffic, ride logs, dodge trains — and **shove your opponent into danger**. Presented like a fighting game: VS screens, rounds, health pips, K.O.s.
- **Tagline (menus, share preview):** "Cross the road. Shove your friends."
- **Visual twist vs. other voxel crossing games:** fighting-game presentation (§8.1), a shared scrolling screen, shove combat, seasons that change with distance, and a world built as a live 3D diorama behind every menu.
- **Never** use the name, characters, UI art or sounds of any existing game.

## 2. Contest constraints (all must be true on the live URL)

- 2+ players join from separate devices with a **4-letter room code** or share link. **No login, no install.**
- A new player understands the rules from in-game guidance (How to Play card + onboarding cues) without anyone explaining.
- Public URL works in a private/incognito window, on phone and desktop.

## 3. Game modes

| Mode | Players | How players get in | Rules |
|---|---|---|---|
| **Solo** | 1 | Home → Solo | Endless run, 1 heart, score = distance. Runs fully in the browser (no server). |
| **Quick Play** | exactly 2 (1v1) | Home → Quick Play → matchmaker pairs two waiting players | Versus rules (§4), best of 3. |
| **Private Room** | 2–4 | Home → Create Room / Join Room (code or link) | Versus rules (§4), best of 3. Host starts. |

## 4. Versus rules (Quick Play + Private Room)

### 4.1 World
- Tile grid, 1 unit per tile. **9 playable columns** (`x = 0..8`). Rows `z` go forward from 0.
- Row types: **Grass** (safe; trees/rocks block movement), **Road** (vehicles kill), **River** (water kills; logs carry), **Rail** (train kills; warning first).
- Columns outside 0..8 are decorative scenery; nobody can stand there.

### 4.2 Movement
- One hop = one tile: forward, back, left, right. Hop duration **140 ms**.
- Trees, rocks, the side edges and the top limit block hops (bonk, no penalty).
- One input may be buffered during a hop; further inputs during the same hop are dropped.
- On a log you are carried with it. Being carried past x < −0.5 or x > 8.5 kills you.
- Landing on water without a log under the landing point kills you (checked when the hop lands). Landing point counts as "on log" if it is within the log's extent shrunk by 0.15 tiles at each end.
- Leaving a log: the landing x is rounded to the nearest integer column (on grass/road/rail) or kept fractional (log to log). If the rounded column is a tree/rock, use the other neighbouring column; if both are blocked, the hop is blocked (bonk) and the player stays on the log.
- Hopping left/right while on a log moves exactly 1 tile from the current fractional x.
- Logs dip slightly (0.05) when a player lands on them (visual only).

### 4.2a Hitboxes & forgiveness (feel matters more than realism)
- Player hitbox: 0.6 × 0.6 tiles, centered. Vehicle hitboxes are the model length minus 0.1 at each end; train full length.
- During a forward/back hop, the player counts as being in the **departure row for the first 50%** of the hop and the **destination row after that**. Left/right hops: x is interpolated, row unchanged.
- Hazard checks run every frame on the client using synced game time.
- **No idle penalty** other than the scrolling camera.
- Animals are **cosmetic only**: identical hitboxes, speed and rules.

### 4.3 Shared camera
- All screens show the **same world window: 9 columns × 13 rows**. Wider or taller screens show extra decorative scenery around it; gameplay-relevant area is identical on every device.
- `camZ` (bottom visible row) is **server-authoritative**, broadcast at 20 Hz, smoothed on clients. Never moves backwards.
- `camZ` advances by whichever is larger:
  - **Auto-scroll:** starts 3 s after HOP!. Speed `min(0.25 + 0.012·t, 1.4)` rows/s.
  - **Leader follow:** keeps the frontmost alive player at most 8 rows above `camZ` (max camera speed 6 rows/s).
- **Top limit:** nobody can hop to `z > camZ + 11`.
- **Bottom edge:** any player with `z < camZ` loses a heart ("Left behind!"). Not prevented by spawn protection or Shield.

### 4.4 Hearts, death, respawn
- Each player has **2 hearts** per round.
- Death causes and on-screen text: car/truck "FLATTENED!", train "DERAILED!", water "SPLASH!", carried off edge "SWEPT AWAY!", bottom edge "LEFT BEHIND!".
- On death: lose 1 heart → cause-specific death animation → **respawn after 1.5 s** at row `camZ + 2`, the free, non-obstacle column nearest column 4 (if the row is river, spawn on the nearest log tile; if none, use the next row up).
- **Spawn protection 2 s** (character blinks): immune to hazards and shoves, **cannot shove**.
- 0 hearts = **OUT** for the round; spectates on the shared camera.

### 4.5 Shoving
- Hopping into a tile occupied by another player = **shove** (shover does not move).
- Victim is pushed **1 tile** in the shover's hop direction.
- **Blocked shove** (victim's destination is tree/rock/side edge/top limit/another player): no push; both do a bounce. Never kills.
- Victim: **0.3 s stun** (inputs ignored), then **1.5 s shove-proof** (faint ring).
- Shover: **2.5 s cooldown** (ring fills under character). Hopping into a player during your cooldown, or into a shove-proof / spawn-protected player = blocked bounce.
- Players never overlap. On logs, occupancy uses positions rounded to the nearest tile.
- **Shove K.O.:** if the victim dies within 2 s of a shove, the shover gets the K.O. A big **"K.O.!"** stamp shows on all screens with a toast: "{shover} shoved {victim} into traffic!" (traffic/the river/the train/off the edge/off the screen).

### 4.6 Crates (self-boosts, catch-up)
- Grass rows with `z ≥ 8`: 25% chance of one **? crate** on a random free column (from seed).
- Step on a crate to claim it (server decides; first valid claim wins). **The leader cannot claim crates** (padlock shown on crates for the leader). Leader = alive player with the highest `z`; if tied, all tied players count as leaders.
- A player pushed onto a crate by a shove claims it if eligible.
- Effects fire **automatically on pickup**, random with equal weight:
  - **Shield** — absorbs the next hazard death or shove within 8 s (bubble; pops with sound). Does not stop "Left behind".
  - **Super Hop** — your next forward hop within 5 s jumps **2 rows** (passes over anything in between; lands with normal rules). If the landing tile is blocked by a tree/rock/player, it becomes a normal 1-row hop.
  - **Slow-Mo** — all hazards in rows `z−2..z+2` (around the claimer) move at **50% for 3 s** for everyone (translucent blue band over those rows).
- One boost per player at a time; a new crate replaces the current boost.

### 4.7 Scoring

**Inside a round**
- **Distance** = highest row reached this round. Your own distance shows as the big number at the top of the screen. Others' show on their player cards.
- **Round winner** = last player with hearts left.
- **Simultaneous knockout** (last players knocked out within 200 ms of each other by server receive time): higher distance wins; equal → draw (nobody scores; round replays with the same players).
- **Safety cap:** if a round reaches 4:00, the round winner is decided by: highest distance → most hearts remaining → whoever reached that distance first (server time). Only if all three are equal is it a draw (replayed).

**Match**
- First to **2 round wins** (best of 3).
- Private rooms with 3–4 players: if after 3 rounds nobody has 2 wins, play one **Showdown** round between only the players tied for most wins (others spectate). Showdown winner wins the match; a drawn Showdown is replayed.

**Match stats (tracked per player):** round wins, best distance, shove K.O.s, times shoved, hearts lost by cause, crates claimed.

**Awards** shown on the Match End screen (show each award that has a qualifying player, max 4, ties → all tied names):
| Award | Condition |
|---|---|
| 🥊 Bully | Most shove K.O.s (≥ 1) |
| 🏃 Marathon | Highest single-round distance |
| 🛡️ Untouchable | Fewest hearts lost (must have finished all rounds) |
| 💦 Swimmer | Most SPLASH! deaths (≥ 2) |
| 🚗 Speed Bump | Most FLATTENED! deaths (≥ 2) |
| 📦 Collector | Most crates claimed (≥ 2) |

**Session scoreboard** (same room, while it exists): match wins per player, shown in Lobby and on Match End.

### 4.8 Spawns (round start, row 1)
- 2 players: columns 3, 5 · 3 players: 2, 4, 6 · 4 players: 1, 3, 5, 7.
- Order = join order. Rows 0–4 are grass with no obstacles in columns 1–7.

### 4.9 Round lifecycle (what resets)
- **New every round:** seed/world, `camZ = 0`, hearts full, positions = spawns, boosts/cooldowns/stun/shove-proof cleared, Slow-Mo events cleared, distance = 0.
- **Carried across rounds:** round wins, match stats.
- **Carried across matches (same room):** session scoreboard, animals, names, host.
- Round flow: `countdown (3 s, inputs ignored)` → `HOP!` → play → last player standing → 0.8 s slow-motion freeze on the final knockout → Round End screen (4 s) → next countdown.

### 4.10 Pacing cues
- Every 30 s of round time, a small "SPEED UP!" toast + whoosh as auto-scroll speed rises.
- Leader changes: "{name} takes the lead!" toast, at most once every 5 s.
- Final round: music switches to its faster variant (+10% playback rate) and the banner says "FINAL ROUND".
- Expected match length: 4–7 minutes.

### 4.11 Emotes
- Four emotes: 😂 😱 👏 😤. Shown as a pop-up bubble above the sender's player card (and above their animal in lobby / results).
- Available in Lobby, Round End, Match End and **while OUT** (spectating). **Not available to alive players during a round** (prevents accidental taps).
- Phone: emote button bottom-left opens a 4-icon fan. PC: keys 1–4. 2 s cooldown per player.
- No text chat anywhere.

## 5. Solo mode

- Same world, controls, animations, camera rules (auto-scroll + follow), biomes and crates (no leader rule).
- **1 heart.** No respawn. Score = distance.
- **Best score** saved in `localStorage` (try/catch). A **"BEST" flag** stands in the world at your best row; passing it triggers a "NEW BEST!" burst.
- Game Over screen → **Retry** must restart in under 1 s (tap button, Space or Enter). No server involved.
- Solo is also offered as the fallback when Quick Play waits too long (§6.2).
- **Pause (Solo only):** ⚙ / Esc / gamepad Start → Pause menu: **Resume** (3-2-1 countdown before play continues), **Restart**, **Settings**, **Quit to menu**. Auto-pause when the tab is hidden or the window loses focus.
- **First-time hint:** if no Solo best exists, Home shows a small badge on SOLO: "New? Practice here first!".
- Solo countdown: "3 · 2 · 1 · HOP!" (shortened to 1 s on Retry).

## 6. Rooms & matchmaking

### 6.1 Private rooms
- `POST /api/rooms` → `{code}`. Code: 4 letters from `ABCDEFGHJKLMNPQRSTUVWXYZ` (no I, O). Generate randomly; if the Durable Object for that code is already active, retry (max 10, then error).
- Codes are case-insensitive on input; display uppercase.
- WebSocket `GET /ws/room/:code`. Unknown/expired code → "Room not found".
- Max **4 players**. 5th → "Room is full (4/4)". Joining while a match is running → spectator. When the match ends, waiting spectators become players if there is room (max 4, in join order) — for both **Rematch** and **Back to Lobby**. If the room is full they stay spectators with "Room full — you'll join when a spot opens".
- Quick Play rooms are 1v1 only and cannot be joined by code (`ROOM_NOT_FOUND`).
- **Host** = creator; if host leaves, host passes to the earliest-joined remaining player.
- Room expires 5 min after the last player leaves.

### 6.2 Quick Play matchmaking algorithm
- One global **Matchmaker** Durable Object (`idFromName("global")`). Client opens `GET /ws/quick`.
- On connect the player is appended to a FIFO queue with `{playerId, name, animal, joinedAt}`.
- Whenever the queue has ≥ 2 live players: pop the first two, create a room (private, quick-play flag, no host), send both `matched {code}`. Both clients connect to the room automatically.
- The room starts automatically when both are connected (VS screen → countdown). If either fails to connect within 10 s, the other goes back to the **front** of the queue with a "Opponent didn't connect — still searching" toast.
- A player whose socket closes is removed from the queue immediately. The Matchmaker uses the **WebSocket Hibernation API** (`ctx.acceptWebSocket`, `webSocketMessage`/`webSocketClose` handlers) and keep-alives via `setWebSocketAutoResponse("ping" → "pong")`, so it sleeps between events and never runs timers while idle (free-plan budget, §15b). Stale sockets are detected by the client-side ping failing and by `webSocketClose`/`webSocketError`.
- The 60 s "Nobody's around" prompt is timed **on the client**, not on the server.
- **Waiting UI:** animated search, elapsed timer, Cancel.
- **At 60 s without a match:** modal "Nobody's around right now." with three buttons: **Keep searching** (modal comes back every further 60 s), **Play Solo** (leaves the queue, starts Solo), **Invite a friend** (leaves the queue, creates a Private Room, shows its code/link).
- Quick Play rematch: Match End shows **Rematch** (both must tap within 20 s; shows "Opponent wants a rematch!") and **New opponent** (back into the queue) and **Menu**.

### 6.3 Room state machine (server)
`LOBBY → COUNTDOWN → PLAYING → ROUND_END → (COUNTDOWN | MATCH_END) → (COUNTDOWN on rematch | LOBBY)`
- COUNTDOWN aborts back to LOBBY (Private) or to the queue (Quick Play) if fewer than 2 players remain connected.
- PLAYING with only 1 connected player left (others left or timed out) → that player wins the match by forfeit ("Opponent left — you win!").

## 7. Replayability

- **Private Room Match End:** host gets **Rematch** (immediate new match, same players and animals, new seeds) and **Back to Lobby** (players can change animals; new players can join). Non-hosts see "Waiting for host…" and **Leave**.
- **Quick Play:** Rematch ready-check (§6.2).
- Every round uses a fresh seed; biomes, crates and lane layouts change every time.
- Session scoreboard and awards give reasons to run it back.
- Solo best score + BEST flag give a personal target.

## 8. UI & screens

### 8.1 Style guide
- **Look:** chunky 3D voxel. Menus are overlays on a **live 3D diorama** of the game world (traffic passing, your animal idling, slow camera drift), never a flat background.
- **Fighting-game presentation (the twist):** slanted banners (−4°), diagonal wipe transitions (250 ms), **VS splash** before every match, announcer **"ROUND 1… HOP!"**, **"K.O.!"** stamp on shove kills, **"FINAL ROUND"**, **"WINNER!"**. Player cards with portrait + hearts as health pips, P1 left / P2 right in 1v1.
- **Title logo:** "HOP BRAWL" as a 3D voxel-letter model (from Blender) that drops into the diorama with a bounce on first load.
- **Fonts** (self-hosted via `@fontsource`): **Pixelify Sans** (titles, numbers, banners) and **Nunito** 700/800 (body, buttons).
- **Text over 3D:** white fill, 3 px outline `#1B1B2F`, 0 4 px 0 hard shadow.
- **Colors:**
  | Token | Hex | Use |
  |---|---|---|
  | Brawl Yellow | `#FFD23F` | primary buttons, highlights |
  | Knockout Red | `#EE4266` | danger, K.O., leave |
  | Lane Green | `#3BCEAC` | go/confirm, ready |
  | Sky Blue | `#4EA8DE` | info, slow-mo |
  | Ink | `#1B1B2F` | outlines, text on light |
  | Cream | `#FFF6E5` | panels |
- **Buttons:** voxel blocks — flat top color, 6 px darker "side" underneath; press = move down 4 px + side shrinks (60 ms), release bounces back. Min 48 px tall. Click sound on press.
- **Player colors (by join slot, also shape-coded for colorblind players):** P1 coral `#FF6B6B` ● circle · P2 blue `#4D96FF` ■ square · P3 green `#6BCB77` ▲ triangle · P4 purple `#C77DFF` ◆ diamond. Used for the tile marker, name tag and card border.
- **Animals (6, unique per room):** chicken, frog, fox, penguin, pig, cat.
- Min text size 16 px on phone. All screens respect `env(safe-area-inset-*)`. Every button reachable by keyboard (Tab/Enter, Esc = back).

### 8.2 Screen list (layout + exact copy)

1. **Loading** (first visit): voxel chicken hopping on a progress bar, "Loading… {n}%". Preloads all models, sounds, fonts. Continues to Home automatically.
2. **WebGL unsupported:** "Hop Brawl needs a browser with 3D graphics (WebGL2). Try the latest Chrome, Safari or Firefox."
3. **Home** (over diorama): logo; name field (placeholder "Your name", 1–12 chars, remembered in `localStorage`); animal carousel (swipe/arrows, the chosen animal hops in the diorama); buttons stacked: **QUICK PLAY** (yellow, largest), **PLAY WITH FRIENDS** (green → Create/Join sheet), **SOLO** (blue); small row: **How to Play**, **Settings**; footer: "Credits". If no name is set when a mode is chosen, focus the name field with a shake.
4. **Play with Friends sheet:** **Create Room** · divider "or join" · 4 large letter boxes (auto-advance, paste supported) + **Join**. Opened via `/?room=ABCD` → code pre-filled, only **Join** needed.
5. **How to Play** (modal, 3 illustrated cards, swipe/arrows, "Got it!"):
   - Card 1 — **Hop forward. Survive.** "Tap or swipe on phone · Arrow keys / WASD on PC. Dodge cars and trains, ride logs, and don't fall off the bottom of the screen."
   - Card 2 — **Shove to win.** "Hop into your opponent to shove them one tile — into traffic, if you're lucky. Shoving has a short cooldown."
   - Card 3 — **Last one hopping.** "You have 2 hearts per round. Last one standing wins the round. First to 2 rounds wins. Grab ? crates for a Shield, Super Hop or Slow-Mo — the leader can't grab them."
6. **Settings** (modal): Music volume, SFX volume, Haptics on/off, Reduce motion on/off (no screen shake, fewer particles), Graphics Auto/High/Low, Name. All saved in `localStorage`.
7. **Lobby (Private):** slanted banner "ROOM {CODE}"; **Copy link** + **QR code**; up to 4 player cards on a voxel starting line in the diorama (animals standing there), each with name, color/shape badge, crown for host, session match wins; animal picker (taken = greyed); host **START** (disabled until 2 players: "Need 1 more player"); non-host "Waiting for host to start…"; **Leave**.
8. **Quick Play search:** "Finding an opponent…" + spinning voxel crate + timer mm:ss + **Cancel**. 60 s modal per §6.2.
9. **VS splash** (2.0 s): screen splits diagonally, each player's animal + name slides in from its side, big "VS" slams in the middle with camera shake.
10. **Countdown:** "ROUND {n}" banner → 3 · 2 · 1 → "HOP!" (announcer voice). Round 1 shows the onboarding control cue (§9.2). Inputs are ignored until HOP!.
11. **In-round HUD:**
    - Top center: your distance (large Pixelify number).
    - Top row: player cards (portrait, name, hearts, round-win pips). 1v1: left/right. 3–4 players: compact row.
    - Under cards: "ROUND {n}" small.
    - Bottom-right: active boost icon with countdown ring.
    - Top-right: ⚙ button → pause-free menu (Settings, Leave match → confirm "Leave? You'll forfeit.").
    - Event toasts center-top (max 2, 2.5 s each). Biome toast on biome change ("❄ SNOW ZONE").
12. **Own death:** cause text slams center for 1 s ("SPLASH!"), heart pip cracks and falls off the card, then respawn.
13. **OUT:** greyscale filter on your card, small banner "You're out — cheering from the sidelines". Camera unchanged.
14. **Round End** (4 s, auto-continue): "K.O.!" or "ROUND OVER" → winner's animal does a victory dance, round pips update, "{name} WINS ROUND {n}!". Before the deciding round: "FINAL ROUND".
15. **Match End:** "WINNER!" banner, voxel podium with animals (1st/2nd/3rd/4th), voxel confetti; awards cards (§4.7); stats table (round wins, best distance, K.O.s, hearts lost, crates); session scoreboard; buttons per §7 (Private) or §6.2 (Quick Play); **Share result** (Web Share API / copy text "I won Hop Brawl 2–1! Play: {link}").
16. **Solo HUD:** distance big top center, BEST below it small, boost icon, ⚙.
17. **Solo Game Over:** cause text, "SCORE {n}", "BEST {n}" (+ "NEW BEST!" burst), **RETRY** (big), **Menu**.
18. **Error/notice screens & toasts:** "Room not found", "Room is full (4/4)", "Connection lost — reconnecting…" (spinner; after 10 s: "Couldn't reconnect" + **Back to menu**), "Server unreachable — try Solo while we wait" (+ **Play Solo**), "Opponent left — you win!", "Host left — {name} is now host".
19. **Credits:** all third-party assets with license (from `CREDITS.md`).

### 8.3 Seamless flow (top priority — no page ever "loads")
**Core principle: the whole app is ONE continuous 3D scene.** The WebGL canvas is created once and never destroyed, hidden or reset. Menus are UI layers that animate in/out over it; the camera **travels** between places in the same world. There are no page reloads, no white/black flashes, no hard cuts.

- **Single-page app**, History API for URLs (`/`, `/?room=CODE`); browser Back = in-app Back (with leave confirmation during a match). No full reloads ever.
- **Camera "stations"** in the world, connected by smooth camera flights (Catmull-Rom path, 700 ms, easeInOutCubic):
  | Screen | Camera station |
  |---|---|
  | Home | close orbit around your animal on the diorama, slow drift |
  | Animal carousel | camera stays; animals swap with a hop-out / hop-in (old animal hops off-screen left, new one hops in from right, 250 ms) |
  | Lobby | pulls back to the starting line where all players' animals stand side by side |
  | Quick Play search | slow circling shot of your animal waiting at the roadside |
  | VS splash | camera pushes in between the two animals, then cuts to the 2D VS overlay |
  | Countdown → play | camera flies from the lobby angle down into the gameplay angle **during** the 3-2-1, so HOP! starts at the exact gameplay framing |
  | Round End | slow orbit around the round winner (world frozen in a 0.8 s slow-mo first) |
  | Match End | flight to the podium set beside the road |
  | Solo Game Over | camera holds; world desaturates 60% over 400 ms; UI slides in |
- **Same world from menu to game:** pressing SOLO doesn't load anything — UI slides out, the camera settles into gameplay framing, your animal is already standing on row 1, countdown starts.
- **Round-to-round / Retry transition — "tile flip":** the screen is covered by a grid of voxel tiles flipping over (diagonal wave, 300 ms), the new world is swapped in underneath while covered, tiles flip away (300 ms). Used for: Solo Retry, new round, Rematch. Never a blank frame.
- **UI motion system (applies to every element):**
  | Motion | Duration | Easing |
  |---|---|---|
  | Panel/button enter | 280 ms | easeOutBack (overshoot 1.4) |
  | Panel/button exit | 160 ms | easeInCubic |
  | Stagger between list items | 40 ms | — |
  | Screen wipe (diagonal) | 250 ms | easeInOutQuart |
  | Button press / release | 60 ms / 180 ms | easeOutQuad / easeOutBack |
  | Number count-up (scores, stats) | 600 ms | easeOutCubic, tick sound every step |
  | Toast in / out | 220 ms / 180 ms | easeOutBack / easeInCubic |
  | Banner slam (K.O., VS, ROUND) | 180 ms in + 6 % overshoot, hold, 200 ms out | easeOutBack / easeInCubic |
  - Only `transform` and `opacity` are animated in the DOM (GPU-composited). No animating width/height/top/left.
  - Every transition is **interruptible**: a new navigation smoothly reverses/redirects the running one (GSAP timelines with `overwrite: "auto"`); input is never blocked by an animation for more than 150 ms.
  - Exit and enter animations overlap (enter starts at 60 % of exit), so there is never an empty frame.
- **Music never stops abruptly:** one menu loop plays continuously across Home → Lobby → Quick Play search → VS (no restart between menu screens). At HOP! it crossfades (1.2 s) into the gameplay/biome track. On death in Solo / being OUT, music gets a low-pass filter (muffled) instead of stopping. Round End: gameplay music ducks, sting plays, music resumes. Match End: victory fanfare → crossfade back to the menu loop. Pause (Solo): low-pass + 50 % volume.
- **No jank checklist (mandatory):**
  - All models, textures, fonts, sounds loaded and **all shaders pre-compiled** (`renderer.compile(scene, camera)` with every model/material placed once off-screen) during Loading, so nothing hitches on first appearance.
  - Particle systems, toasts, death effects and rows are **pooled**; no `new` in the render loop; no geometry/material creation during play.
  - Fixed-cost frames: no DOM queries, layout reads or `JSON.stringify` of big objects in the frame loop.
  - Network messages are handled outside the render path and applied at the next frame.
  - Screen sizes use `dvh`/`dvw` (no iOS address-bar jump); resize is debounced and the camera re-fits smoothly.
  - Fonts preloaded (`<link rel="preload">`) so text never swaps.
  - First interactive frame of Home < 3 s on 4G (music may stream in after; models/sounds needed for Home first).

## 9. Controls, feel & visual cues (top priority)

### 9.1 Input
| Action | Phone | PC keyboard | Gamepad (P1) |
|---|---|---|---|
| Hop forward | tap anywhere / swipe up | ↑, W, Space | D-pad up / left stick up / A |
| Hop left/right | swipe left/right | ←/→, A/D | D-pad / stick |
| Hop back | swipe down | ↓, S | D-pad down / stick down |
| Shove | hop into a player | same | same |
| Menu | ⚙ button | Esc | Start |
| Confirm (menus) | tap | Enter | A |
- Pointer Events. Direction is decided **as soon as the finger travels 24 px** (don't wait for release). A tap = release under 24 px within 250 ms. One gesture = one hop.
- Canvas: `touch-action: none`; block pinch-zoom, double-tap zoom, pull-to-refresh, text selection, long-press menu during play.
- Keyboard: ignore auto-repeat; one hop per press.
- Gamepad: Gamepad API polled each frame; stick deadzone 0.5, one hop per push.
- **The local hop starts animating on the same frame the input is read** (prediction). Never wait for the server.
- **Haptics** (`navigator.vibrate`, where supported): 8 ms hop, 25 ms shove given/received, 60 ms death. Off when Haptics setting is off.

### 9.2 Visual cues
- **Onboarding overlay** until the player makes 3 hops (first round of the session or first Solo run): phone → animated hand demonstrating tap and swipe; PC → animated keycaps (arrows + WASD). Fades out after 3 hops.
- **"YOU" marker:** soft rounded square under your character in your player color + a small "YOU" arrow above your head for the first 3 s of each round.
- **Name tags** above every player (yours bold).
- **Off-screen/edge indicators:** if a player is within 1 row of the top/bottom edge, show an arrow with their animal icon at that edge.
- **Danger cues:** rail lane flashes red + warning light + bell 1.5 s before a train. Bottom 2 rows: pulsing red vignette while you stand there. Near-miss (vehicle passes within 0.3 tiles): small "WHOOSH" streak.
- **Blocked move:** bonk animation + thud + tiny ✕ puff.
- **Rings:** shove cooldown ring (fills over 2.5 s) under your character; shove-proof ring on recently shoved players; blinking for spawn protection.
- **Leader crown** above the leader; padlock on crates while you lead.
- **Boost visuals:** Shield bubble, Super Hop glowing feet + spring sound, Slow-Mo blue band over affected rows.
- **No pause** in versus. On returning to a hidden tab: "Resyncing…" until a fresh snapshot arrives.

### 9.3 Smoothness requirements
- `requestAnimationFrame` loop; everything animated by elapsed time (delta), never per-frame steps.
- Hazards positioned from synced game time every frame.
- Remote players: 100 ms interpolation buffer, hop arcs reconstructed (not linear sliding). Snap only if > 3 tiles off.
- Camera: critically damped spring toward the server `camZ`.
- No DOM layout changes during play (HUD updates only text/transform/opacity). Zero per-frame allocations in the render loop; pooled particles.
- Everything preloaded before play is possible.
- **Graphics quality:** tiers, adaptive downgrade and dynamic resolution per §19b. Settings override.
- Target: stable 60 fps on desktop and on mid-range phones (Medium tier); never visible stutter.

## 10. World generation (deterministic, shared)

- `shared/worldgen.ts` and `shared/hazards.ts` are **pure functions** of `(seed, z, t)`; used by client, server and Solo.
- PRNG: `mulberry32`; per-row seed `hash32(roundSeed, z)` so any row can be generated alone.
- Rows 0–4: grass. From row 5, difficulty `d = min(1, z/150)`; weights Grass 30%, Road 40%, River 20%, Rail 10%.
- Constraints: ≤ 4 consecutive Road; ≤ 3 consecutive River; never 2 Rail in a row; adjacent River rows alternate direction.
- **Grass:** 0–3 obstacles; never block all columns; no obstacle on a crate.
- **Road:** direction ±1; speed `rand(1.5,3.0)·(1+0.8d)` tiles/s; car (1 tile, 80%) / truck (2 tiles, 20%); gaps `rand(3,7)` tiles; vehicles loop over x ∈ [−6, 15].
- **River:** logs 2–4 tiles; speed `rand(1.0,2.2)·(1+0.5d)`; gaps 1.5–3 tiles; loop over x ∈ [−6, 15].
- **Rail:** train period `rand(6,10)` s (phase from seed); warning 1.5 s before; train = engine + 3 carriages = 12 tiles at 25 tiles/s.
- **Slow-Mo time warp:** for affected rows, effective time `t − 0.5·overlap(t, [t0, t0+3])`. Overlapping Slow-Mo windows on the same row do not stack: the union of the windows is slowed once.
- **Fairness / solvability guarantees (enforced by the generator, covered by tests):**
  - Rows 5–14: no Rail; road speed capped at 2.0; max 2 consecutive Road.
  - Road: the time gap between consecutive vehicles passing any column is ≥ 0.6 s.
  - River: at every column, a log arrives at least every 2.5 s; two consecutive River rows never have the same speed.
  - Rail: never directly next to a respawn row chosen at round start (rows 0–4).
  - Grass between two rows of Road/River/Rail always has at least 4 free columns.
- Crates below `camZ` are removed.
- **World streaming:** generate/render rows `camZ − 4 … camZ + 20`; recycle meshes for rows that leave (dispose nothing per frame; reuse pooled row objects).
- **Home diorama** uses fixed seed `20261030`.
- **Biomes by distance** (visual only):
  | Rows | Biome | Look |
  |---|---|---|
  | 0–39 | Meadow | warm daylight, green grass, oaks, flowers |
  | 40–79 | Autumn | orange/red trees, drifting leaves, golden light |
  | 80–119 | Snow | white ground, pines, falling snow, icy-blue water |
  | 120+ | Night City | dark asphalt, street lamps, headlights, moonlight |
  4-row blend between biomes; lighting, fog and sky lerp with `camZ`.

## 11. Networking (seamless sync)

### 11.1 Authority
| Thing | Decided by |
|---|---|
| Hazard positions | shared deterministic code + synced clock (never streamed) |
| Own death by car/train/water/edge-carry | the dying player's client |
| Hops, occupancy, shoves, stun, cooldowns, crates, boosts, slow-mo | server |
| `camZ`, Left-behind deaths, round/match state, awards | server |

### 11.2 Mechanics
- **Clock sync:** 5 pings on joining a room and again at each COUNTDOWN; during PLAYING one ping every 5 s (keeps the estimate fresh). No clock pings while in LOBBY/MATCH_END (lets the room hibernate). Offset = median of `serverNow − (t0+t1)/2`. Game time `= (serverNow − roundStartAt)/1000`.
- **Prediction:** client applies its hop immediately with `seq`; server replies `hopResult`. Rejected → bounce back to the authoritative tile (animated, not a teleport).
- **Server movement model:** each player is either on a fixed tile or `onLog {z, offsetFromLogStart}`; server computes log positions with the shared code.
- **Server hop validation:** alive, not stunned, not in respawn, ≥ 100 ms since last accepted hop, destination in bounds, not obstacle, not above top limit, occupancy/shove rules (§4.5). Processed in arrival order.
- **Remote rendering:** 100 ms interpolation buffer.
- **Positions on logs:** client sends `pos` at 15 Hz while on a log; otherwise only hops.
- **Server tick:** 20 Hz while COUNTDOWN/PLAYING/ROUND_END only (camera, Left-behind checks, timers, `cam` broadcast). In LOBBY and MATCH_END there are **no intervals or timers**; the Room uses the WebSocket Hibernation API so it sleeps while people sit in menus (timeouts like rematch 20 s / idle close use Durable Object **alarms**, not `setTimeout`). Room state needed after waking is kept in DO storage or socket attachments (`serializeAttachment`).
- **Reconnect:** `resumeToken` in `sessionStorage`; reconnect with exponential backoff (0.5, 1, 2, 4 s) up to 10 s; server sends a full `snapshot`.
- **Protocol version:** client sends `v` (from `package.json` version) in `join`. Mismatch → server replies `error {code:"VERSION"}` → client shows "A new version of Hop Brawl is ready — Refresh" with a Refresh button.
- **Shield:** the client knows its shield state. If a hazard would kill a shielded player, the client pops the shield instead and sends `shieldPop`; the server confirms and broadcasts. Shoves into a shielded player: server pops the shield and blocks the shove (bounce).
- **Super Hop:** server applies 2 rows for the next forward `hop` while the boost is active; client predicts the same.
- **Death reports** from a client are accepted unless the server has that player as spawn-protected (then ignored and the client is corrected via `snapshot`).
- **Crate claims:** the server checks that the claimer's authoritative tile is the crate tile.
- **Rejected hop:** any buffered input queued behind it is discarded.
- **Ping indicator:** small signal-bars icon in the HUD corner: green < 80 ms, yellow < 160 ms, red ≥ 160 ms (RTT from clock-sync pings).
- **Hidden tab (versus):** sockets stay open; on `visibilitychange` back to visible → `requestSync`.

### 11.3 Messages (JSON; validated with zod on the server; max 1 KB each)
Client → Server: `join {v, name, animal, resumeToken?}`, `setAnimal {animal}`, `start`, `kick {playerId}`, `rematch`, `toLobby`, `ping {t0}`, `hop {seq, dir}`, `pos {x, z}`, `died {cause, x, z}`, `shieldPop`, `claimCrate {crateId}`, `emote {id}`, `requestSync`, `leave`.
Server → Client: `welcome {playerId, resumeToken, snapshot}`, `lobby {players, hostId, session}`, `error {code, message}`, `pong {t0, serverNow}`, `countdown {round, startsAt}`, `roundStart {round, seed, startAt, spawns}`, `hopResult {playerId, seq, ok, x, z, shove?}`, `shoved {victimId, byId, x, z}`, `pos {playerId, x, z}`, `cam {z, t}`, `playerDied {playerId, cause, heartsLeft, koBy?}`, `respawn {playerId, x, z, protectedUntil}`, `shieldPopped {playerId}`, `crateTaken {crateId, byId, boost}`, `slowmo {rows, t0}`, `emote {playerId, id}`, `kicked`, `roundEnd {winnerId|null, draw, stats}`, `matchEnd {winnerId, stats, awards, session}`, `rematchStatus {ready:[ids]}`, `snapshot {...}`.
- Error codes: `ROOM_NOT_FOUND`, `ROOM_FULL`, `VERSION`, `BAD_NAME`, `RATE_LIMIT`, `SERVER`.
Matchmaker: `queued {position}`, `matched {code}`, `ping/pong`.
- Rate limit 30 msgs/s per socket; excess dropped; 3 seconds of sustained abuse → disconnect.

## 12. Art — models

### 12.1 Pipeline
1. **Source of truth:** each model is a voxel file in `/art/voxels/<name>.json` (`{size:[x,y,z], palette:[hex…], voxels:[[x,y,z,colorIndex]…]}`), written by Codex.
2. **Blender via Blender MCP:** a script (`/art/build_models.py`) imports each voxel file, builds cubes, merges them, removes interior faces, assigns vertex colors from the palette, **bakes ambient occlusion into a vertex color layer** (Cycles, 64 samples), sets the origin to bottom-center, and exports `.glb` to `client/public/models/`. Use the MCP connection to view the result and iterate on looks.
3. **Fallback if Blender MCP is unavailable:** run the same script headless: `blender -b -P art/build_models.py`.
4. **Last-resort fallback:** build meshes at runtime from the voxel JSON with greedy meshing in Three.js (no AO bake; use a cheap per-vertex AO approximation).
- Scale: **1 tile = 12 voxels.** Export with +Y up, transforms applied, no textures (vertex colors only), no Draco. Total < 3 MB.
- Use `InstancedMesh` for repeated props/vehicles.

### 12.2 Model list (voxel sizes W×H×D)
| Model | Size | Notes |
|---|---|---|
| chicken | 8×11×8 | white body, red comb, orange beak/feet |
| frog | 9×7×9 | green, big eyes on top |
| fox | 8×10×10 | orange, white chest, tail as separate mesh (wag) |
| penguin | 8×11×8 | black/white, orange beak |
| pig | 9×9×10 | pink, snout, curly tail |
| cat | 8×10×9 | grey tabby stripes, tail separate mesh |
| car ×3 | 12×9×10 | sedan (red), hatch (blue), taxi (yellow); windows, wheels, lights |
| truck | 24×13×11 | cab + box trailer |
| train engine / carriage | 36×16×11 each | engine red/black, carriages blue |
| log segment + end cap | 12×5×10 | bark ring detail |
| lily pad | 8×1×8 | decorative |
| tree: oak / autumn / pine | 10×20×10 | biome variants |
| rock / snowy rock | 8×6×8 | |
| flowers, leaf pile | 6×3×6 | decorative |
| street lamp, bin | 4×24×4 / 5×7×5 | Night City; lamp has emissive voxel |
| rail track segment | 12×1×12 | |
| warning light post | 4×20×4 | red lamps (emissive when active) |
| crate | 10×10×10 | wooden with "?" on each side |
| BEST flag | 4×20×8 | Solo |
| podium | 3 blocks | Match End |
| title logo "HOP BRAWL" | voxel letters | Home |
- Animals must be recognizable by **silhouette**. Each animal has eyes that can blink (two eye voxels swapped by a material toggle or a separate eye mesh).
- **Ground tiles** are generated in code (boxes per biome color with ±4% per-tile brightness noise; road tiles with lane dashes; rail with sleepers; river as animated water plane with gentle vertex wave).

### 12.3 Biome palettes
| Biome | Grass | Road | Water | Sky top/bottom | Sun |
|---|---|---|---|---|---|
| Meadow | `#8BD46E`/`#7CC861` alt rows | `#4A4E5A` | `#5CC8FF` | `#87CEFA`/`#E0F6FF` | warm white `#FFF4E0` |
| Autumn | `#C9B458`/`#BDA74E` | `#4F4A47` | `#4FA3C7` | `#F6B98A`/`#FFE6CC` | golden `#FFD59A` |
| Snow | `#F2F6FA`/`#E6EDF4` | `#5A6270` | `#9ED8F0` | `#B8D4E8`/`#F0F6FA` | cool `#E8F0FF` |
| Night City | `#2E3A3F`/`#29343A` | `#24262E` | `#1F3D5A` | `#0B1026`/`#26325A` | moon `#9DB4FF` (dim) + lamp point lights |

### 12.4 Lighting & rendering
- Three.js `WebGLRenderer` (antialias on High), `ACESFilmicToneMapping`, sRGB output.
- HemisphereLight + one DirectionalLight with soft shadows (PCFSoft; map 2048 desktop / 1024 phone), shadow camera follows `camZ`.
- Camera: perspective, FOV 35°, fixed angle looking forward and slightly sideways (about 55° down, rotated 15° around Y) so lanes read diagonally; distance adjusts with aspect ratio so the 9×13 window always fits.
- Fog color matches sky bottom; fades rows beyond the top of the window.

## 13. Animation & effects (procedural)

| Event | Animation |
|---|---|
| Hop | 40 ms anticipation squash (y 0.8, xz 1.1) → arc (height 0.5) with stretch (y 1.15) → landing squash → settle (total 140 ms); face hop direction (80 ms ease) |
| Landing | voxel dust puff (biome-colored; snow puff in Snow) |
| Idle | breathing bob every 1.2 s; blink every 2–5 s; fox/cat tail wag |
| Bonk | move 0.25 toward target and back (100 ms) |
| Shove (shover) | lunge 0.15 + snap back |
| Shoved (victim) | knock arc + wobble spin; star particles during stun |
| FLATTENED | squash to y 0.1, stays 1 s, tire-mark decal |
| SPLASH | sink + splash particles + ripple ring |
| DERAILED | flung off-screen spinning |
| SWEPT AWAY | carried off with flailing wobble |
| LEFT BEHIND | fade + poof |
| Respawn | drop from above with bounce + blinking |
| Crate pickup | crate bursts into planks, boost icon flies to HUD |
| Shield pop | bubble shatters into blue shards |
| Victory | animal-specific dance (spin + hops) on Round End / podium |
| Vehicles | slight body bob; wheels don't need to rotate; headlights at night |
| Train | warning lamp flashes; slight camera shake when passing near you |
| Camera shake | 0.15 s on deaths within 3 tiles and on VS/K.O. stamps (off with Reduce motion) |
| UI | GSAP timelines for VS splash, K.O. stamp, banners, wipes; buttons per §8.1 |

## 14. Audio

### 14.1 Sources (all must be CC0 or royalty-free without attribution requirements, logged in `CREDITS.md` with URL + license)
- **SFX:** Kenney audio packs (kenney.nl, CC0) — e.g. *Impact Sounds*, *Interface Sounds*, *Jingles*, *Digital Audio*. Missing sounds → generate with **jsfxr** (sfxr.me) and commit the exported files.
- **Announcer lines** ("Round one", "Round two", "Final round", "Hop!", "K.O.!", "Winner!", "Showdown!"): generate with **OpenAI text-to-speech** (the `speech` skill), energetic announcer style, then add light reverb/compression.
- **Music:** CC0 loops from OpenGameArt (filter: CC0) or tracks under the Pixabay Content License. Required tracks:
  | Track | Mood | Used on |
  |---|---|---|
  | Menu loop | bouncy, playful, mid-tempo (~110 BPM), seamless loop | Loading → Home → Lobby → Quick Play search → VS |
  | Gameplay loop ×4 (one per biome, ideally same key/tempo so crossfades blend) | upbeat chiptune/toy-pop (~130 BPM) | in-round, crossfaded on biome change |
  | Final-round variant | gameplay loop at +10 % rate | final/showdown round |
  | Round win sting (2–3 s), match win fanfare (4–6 s), solo game-over sting (2 s), new-best sting | — | results screens |
  - All loops trimmed to exact bar lengths and verified gapless.

### 14.2 Sound list
hop (3 pitch variants), bonk, shove whoosh, shoved grunt (per animal: cluck, ribbit, yip, squawk, oink, meow), splash, car pass, near-miss honk, truck rumble, train bell, train rush, crate pickup, shield up, shield pop, super hop boing, slow-mo down/up, heart lost, respawn drop, countdown beeps, announcer lines, round win jingle, match win fanfare, new best, UI click, UI back, matchmaking found.

### 14.3 Playback
- **Howler.js** (Web Audio mode). Decode everything during loading.
- Formats: SFX `.mp3` mono; music `.ogg` + `.m4a` (Howler picks the supported one) so loops are gapless.
- Hazard sounds attenuated and panned by distance from the local player.
- Music crossfades (1.5 s) on biome change; lobby loop in menus.
- Music volume default 0.5, SFX 0.8. Audio unlocks on first tap/key.
- Ducking: music drops 40% for 1 s during announcer lines.

## 15. Tech stack & libraries

Pin exact versions (latest stable at project start) in `package.json`; commit the lockfile.

| Purpose | Library |
|---|---|
| Language/build | TypeScript, Vite |
| 3D | three (+ `GLTFLoader`, `BufferGeometryUtils` from `three/examples/jsm`) |
| UI animation | gsap |
| Audio | howler |
| Fonts | @fontsource/pixelify-sans, @fontsource/nunito |
| QR code | qrcode |
| Message validation | zod (shared) |
| Server | Cloudflare Workers + Durable Objects (SQLite-backed classes `Room`, `Matchmaker`; `migrations = [{ tag = "v1", new_sqlite_classes = ["Room", "Matchmaker"] }]`), wrangler, @cloudflare/workers-types |
| Frontend hosting | **Vercel** (static Vite build) on the owner's custom subdomain — see §15a |
| Tests | vitest, @playwright/test |
| Dev only | lil-gui (live tuning of `config.ts` values with `?debug=1`), stats.js (FPS meter with `?debug=1`) |
- No UI framework; plain TypeScript + HTML/CSS for overlays.
- Browsers: latest Chrome, Edge, Firefox, Safari (macOS + iOS 16+), Chrome Android. WebGL2 required.

## 15a. Deployment (split hosting)

The owner has **only a domain (registered at Hostinger)**, no server. Hosting is split:

| Part | Host | URL |
|---|---|---|
| Frontend (static Vite build: HTML, JS, models, audio) | **Vercel** (free Hobby plan) | `https://hopbrawl.<owner-domain>` (custom subdomain) + Vercel's default `*.vercel.app` URL as backup |
| Game server (rooms, matchmaker, WebSockets, `/api/*`) | **Cloudflare Workers + Durable Objects** (free plan) | `https://hop-brawl.<account>.workers.dev` (`wss://` for sockets) |

Why: Vercel cannot hold long-lived WebSocket connections; Cloudflare Durable Objects can. The domain stays at Hostinger — **no nameserver change**.

**Configuration**
- Client reads the server base URL from `VITE_SERVER_URL` at build time (e.g. `https://hop-brawl.<account>.workers.dev`), derives `wss://…` for sockets. Local dev default: `http://localhost:8787` (`wrangler dev`).
- Server allows cross-origin requests **only** from an allow-list in `wrangler.toml` vars: `ALLOWED_ORIGINS = "https://hopbrawl.<owner-domain>,https://<project>.vercel.app,http://localhost:5173"`.
  - `/api/*`: CORS headers for allowed origins (incl. `OPTIONS` preflight); others rejected with 403.
  - `/ws/*`: check the `Origin` header on the upgrade request; reject non-allowed origins.
- Share/join links always use the **frontend** domain (`https://hopbrawl.<owner-domain>/?room=ABCD`), taken from `window.location.origin`.
- SPA routing on Vercel: `vercel.json` rewrites all paths to `/index.html`; long-cache headers (`immutable`, 1 year) for hashed assets in `/assets`, models and audio; `no-cache` for `index.html` so new deploys load immediately.
- Security headers are set in `vercel.json` (frontend) and in the Worker (API). The frontend CSP's `connect-src` must include the Worker's `https://` and `wss://` origin.

**Deploy order (every release):** deploy the **server first** (`wrangler deploy`), then the frontend (Vercel). The protocol version check (§11.2) shows "Refresh" to anyone on an old client.

**One-time owner setup (Codex: give the owner these exact steps when you reach milestone 7, and wait for confirmation):**
1. Create free accounts at Cloudflare and Vercel.
2. Run `npx wrangler login` (Cloudflare) and `npx vercel login` (Vercel) once on this PC.
3. In Vercel project → Settings → Domains, add `hopbrawl.<owner-domain>`. Vercel shows a DNS record (a **CNAME** for the subdomain, normally `cname.vercel-dns.com`, use exactly what Vercel shows).
4. In Hostinger → Domains → DNS / Nameservers → **DNS records**, add that CNAME: name `hopbrawl`, target as shown by Vercel, TTL default. Don't change nameservers or any other record.
5. Wait for Vercel to show the domain as **Valid** (minutes to a few hours); HTTPS is issued automatically.
6. Open the domain in a private window on phone and laptop and play a match.

## 15b. Cost: $0, no credit card
- Cloudflare **Workers Free** plan only (no payment method on the account), Vercel **Hobby** (free). Nothing in this project may require a paid plan.
- Free-plan Durable Object limits (per day, reset 00:00 UTC): **100,000 requests** (WebSocket connects count 1; incoming messages count at **20:1**; outgoing messages free) and **13,000 GB-s duration**. If exceeded, requests fail until reset — the client shows edge case #59 ("Servers are busy — try Solo").
- Budget estimate: one 2-player match ≈ 300 billable requests → ~300 matches/day. Duration: an awake room ≈ 0.125 GB × seconds → ~29 room-hours of active play/day. Hibernation in menus (§6.2, §11.2) is **mandatory** so idle rooms and the Matchmaker cost nothing.
- Keep client → server messages minimal: no messages while standing still; `pos` only while on logs (§11.2).

## 16. Project structure

```
/client
  index.html
  /src
    main.ts            app bootstrap, screen router
    /game              renderer, scene, camera, world view, players, effects, input, audio
    /net               socket, clock sync, prediction, interpolation
    /ui                screens (home, lobby, hud, results, modals), styles.css
    /solo              solo controller (local authority)
  /public
    /models  /sfx  /music  /voice  og-image.png  favicon.png  manifest.webmanifest
/server
  index.ts             Worker routes: /api/rooms, /ws/room/:code, /ws/quick (CORS + Origin allow-list, no static assets)
  room.ts              Room Durable Object (state machine, tick, rules)
  matchmaker.ts        Matchmaker Durable Object
/shared
  config.ts            ALL tunables (§23)
  rng.ts worldgen.ts hazards.ts rules.ts messages.ts (zod) types.ts
/art
  /voxels/*.json  build_models.py  *.blend
/tests
  unit/*.test.ts  e2e/*.spec.ts
wrangler.toml  package.json  tsconfig.json
README.md  DECISIONS.md  CREDITS.md
```

## 17. Edge cases (all must be handled)

| # | Situation | Behavior |
|---|---|---|
| 1 | Two players hop into the same empty tile at once | server processes in arrival order: first moves in; second's hop becomes a shove attempt on the first (normal shove rules) |
| 2 | A and B shove each other at the same moment | first processed shove resolves; the second is invalid because positions changed → bounce |
| 3 | Shove into a tree/rock/edge/top limit/other player | blocked bounce for both, no damage |
| 4 | Shove backward pushes victim below `camZ` | victim loses a heart (LEFT BEHIND), counts as a shove K.O. |
| 5 | Shove a player sideways off a log into water | victim dies (SPLASH), shove K.O. |
| 6 | Victim is mid-hop when shoved | server uses the victim's destination tile as their position |
| 7 | Victim pushed onto a crate | claims it if eligible (§4.6) |
| 8 | Super Hop landing tile blocked | becomes a normal 1-row hop |
| 9 | Super Hop over the top limit | becomes a normal hop; if that is blocked too, bonk |
| 10 | Respawn tile occupied/obstacle | nearest free column in that row, then next row up |
| 11 | Player respawns into a lane with traffic | spawn protection 2 s covers it |
| 12 | Last two players knocked out within 200 ms | §4.7 tie rule |
| 13 | Two leaders tied | both cannot claim crates |
| 14 | Leader runs to the top limit | further forward hops bonk; camera catches up |
| 15 | Player hides tab / phone locks during a round | they keep standing; normal rules apply (will likely be left behind); on return → "Resyncing…", `requestSync`, snapshot |
| 16 | Disconnect mid-round | character frozen with "📶" icon; 10 s to reconnect; else OUT |
| 17 | Opponent leaves in 1v1 / only 1 player left in room | remaining player wins by forfeit |
| 18 | Host leaves (Private) | host passes on; toast to everyone |
| 19 | Player drops during COUNTDOWN leaving < 2 | abort to Lobby (Private) / back to queue (Quick Play) |
| 20 | Join during a match | spectator → becomes player at Match End/Lobby |
| 21 | Room full / not found / expired | error screens (§8.2) |
| 22 | Duplicate names in a room | append " 2", " 3" |
| 23 | Empty/whitespace/HTML name | trimmed; required 1–12 chars; rendered with `textContent` only |
| 24 | Animal already taken | greyed in picker; on join, auto-assign first free animal |
| 25 | Quick Play: matched opponent never connects | other returns to queue front (10 s timeout) |
| 26 | Quick Play: both press Rematch at different times | ready-check up to 20 s; then "Opponent left" options |
| 27 | Low FPS / slow device | game time is wall-clock based, so hazards stay in sync; auto quality drops |
| 28 | Clock drift / lag spike | periodic resync; remote players snap if > 3 tiles off |
| 29 | Message spam / malformed JSON | rate limit, zod validation, ignore invalid, disconnect abusers |
| 30 | Round exceeds 4:00 | highest distance wins (§4.7) |
| 31 | Draw round | replayed with same participants |
| 32 | Showdown in a 3–4 player room | only tied players play; others spectate |
| 33 | Phone rotated mid-game | renderer resizes; same 9×13 window stays fully visible |
| 34 | Very long run (z in the thousands) | world rows recycled (keep camZ−4 .. camZ+20); positions use doubles, no precision issue |
| 35 | `localStorage` blocked (private mode) | game works; settings/best just don't persist |
| 36 | Audio blocked until interaction | unlock on first tap/key; no errors before |
| 37 | WebGL2 missing | unsupported screen (§8.2) |
| 38 | Server unreachable | Home still works; Quick Play/Rooms show error with **Play Solo** |
| 39 | Same person opens the same room in two tabs | treated as two players (that is how the challenge's two-window testing works) |
| 40 | Leaving a log onto a tree/rock column | other neighbouring column; both blocked → bonk, stay on log (§4.2) |
| 41 | Shove into a shielded player | shield pops, shove blocked (bounce) |
| 42 | Hazard hits a shielded player | client pops shield, player survives, `shieldPop` sent |
| 43 | Two Slow-Mos overlap | union of windows, slowed once |
| 44 | Crate falls below the camera | removed |
| 45 | Client/server version mismatch after a redeploy | "New version — Refresh" screen |
| 46 | Window loses focus while a key is held | clear all held inputs on `blur` |
| 47 | Mouse click on the canvas on PC | same as tap = hop forward; clicks on UI never hop |
| 48 | Tap on an emote/⚙ button | never also triggers a hop |
| 49 | Browser Back during a match | "Leave? You'll forfeit." confirm |
| 50 | Reload during a match | rejoins via `resumeToken` + `?room=` in the URL |
| 51 | Host kicks a player (lobby only) | kicked player sees "You were removed from the room" → Home |
| 52 | Quick Play: both players chose the same animal | second player gets that animal's **alternate palette** (golden variant) |
| 53 | Offensive name in Quick Play | checked against a small built-in blocklist; replaced with "Hopper####" |
| 54 | Lobby idle 30 min | room closes; players see "Room closed due to inactivity" |
| 55 | Solo: tab hidden | auto-pause |
| 56 | Solo: player keeps hopping backward | allowed; the camera still advances, so they get left behind |
| 57 | Navigating while a transition is running | transition redirects smoothly (§8.3), never stacks or blanks |
| 58 | Uncaught JS error | friendly overlay "Something went wrong" + **Reload**; error logged to console |
| 59 | Cloudflare free-tier quota exceeded | "Servers are busy — try Solo" with **Play Solo** |
| 60 | Clipboard API unavailable (copy link) | select the link text in a field and show "Press Ctrl+C / long-press to copy" |

## 17a. Explicit non-features (do NOT build)
- No accounts, login, profiles, friends lists or global leaderboards.
- No text chat or voice chat (emotes only).
- No currency, shop, unlocks, ads or in-app purchases. All 6 animals available from the start.
- No bots or AI opponents.
- No gameplay differences between animals or biomes.
- No pause in versus modes.
- No service worker / offline caching (avoids stale-version bugs).
- English only.
- No analytics, tracking or cookies.

## 18. Accessibility & settings
- Settings in §8.2 #6. Reduce motion disables camera shake, screen wipes become fades, particles halved.
- Player identity never by color alone (shapes + animals + names).
- Contrast: all text ≥ 4.5:1 against its background panel/outline.
- Full keyboard navigation in menus; visible focus ring (3 px Brawl Yellow).

## 19. Security & limits
- Validate every client message with zod; cap message size 1 KB; rate limits per §11.3.
- Names sanitized; never inject user text as HTML.
- No personal data collected; no analytics; no cookies.
- Durable Objects hold state in memory; nothing persisted beyond room lifetime except the room existence flag.

## 19a. Performance budgets
| Budget | Limit |
|---|---|
| Initial download before Home is interactive | < 5 MB (music streams after) |
| Total assets | < 15 MB |
| Draw calls per frame | < 150 (instancing for props/vehicles/ground) |
| Triangles on screen | < 300k |
| JS bundle (gzipped) | < 400 KB |
| Frame time | ≤ 16.7 ms desktop, ≤ 22 ms mid-range phone |
| Hop input → first visible movement | same frame (≤ 16 ms) |
| Local hop → seen on opponent's screen | ≤ RTT/2 + 100 ms |
### 19b. Optimization — must not stutter on mid-range phones
**Reference devices:** a mid-range Android (e.g. Samsung Galaxy A-series from the last ~3 years / Pixel "a" series) and iPhone 11 or newer. **Smoothness beats fidelity**: a stable frame rate with simpler visuals is always preferred over a higher but uneven one.

**Quality tiers** (auto-selected, overridable in Settings):
| Feature | High (desktop) | Medium (default phone) | Low |
|---|---|---|---|
| Pixel ratio | min(devicePixelRatio, 2) | min(devicePixelRatio, 1.5) | 1 |
| Antialias | MSAA | off (FXAA not used) | off |
| Material | MeshStandard (flat) | MeshLambert | MeshLambert |
| Shadows | 2048 PCFSoft | 1024 PCF, players + vehicles only cast | **blob shadows** (instanced dark circle decals), no shadow map |
| Real point lights (Night City) | max 4 | 0 (emissive voxels + additive glow sprites) | 0 |
| Particles | 100 % | 60 % | 30 % |
| Water | vertex-wave plane | vertex-wave plane | flat animated color |
| Weather (leaves/snow) | 400 flakes | 150 | 0 |
| Post-processing | none | none | none |

- **Initial tier:** desktop → High; phones/tablets → Medium. Then **adaptive**: measure frame time continuously (rolling 2 s). If p90 frame time > 20 ms for 3 s → drop one tier (via the tile-flip-free path: change settings between frames, no reload). Never auto-raise during a round (prevents oscillation); may raise between rounds if p90 < 12 ms.
- **Dynamic resolution** inside a tier: scale pixel ratio between 0.75× and 1× of the tier value to hold the frame budget before dropping a tier.
- **Geometry:** voxel meshes with interior faces removed; vertex colors only (no textures at all → no texture uploads); all props/vehicles/logs/trees via **`InstancedMesh`** per model; ground for each row merged into one mesh and **pooled per row type**; frustum culling on.
- **Draw calls:** target < 80 on Medium. Group by material: one shared vertex-color material for everything opaque.
- **Shadow camera** tightly fitted to the visible 9×13 window (plus a small margin) and following `camZ`; shadow map auto-update only on Medium/High.
- **CPU:** zero allocations per frame (pre-allocated vectors/matrices, object pools for particles, toasts, rows, network snapshots); no closures created per frame; hazard math is simple arithmetic (no per-frame worldgen).
- **Animation work** only for things on screen; remote players' interpolation buffers capped at 20 entries.
- **Frame pacing:** `requestAnimationFrame` only (no `setInterval` rendering); clamp delta to 50 ms to avoid jumps after hitches; game logic uses synced time, so visuals catch up without speeding up.
- **Audio:** max 16 simultaneous voices; lowest-priority sound (distant traffic) is dropped first; sounds are pre-decoded.
- **Network:** messages are tiny JSON; position updates throttled (§11.2); parsing happens in the socket handler, applied next frame.
- **Thermal/battery:** cap at 60 fps (no uncapped high refresh); when in menus with nothing moving fast, the diorama stays animated but particles reduced.
- **Shader warm-up** and full preloading (§8.3) — no first-time hitches.
- **Performance test (required, automated):** Playwright run in a 390×844 mobile viewport with Chrome DevTools **CPU throttling 4×**, playing 60 s of scripted gameplay with 2 players. Pass criteria: p95 frame time ≤ 22 ms, **no single frame > 50 ms after the first 3 s**, no GC pauses > 10 ms (from a performance trace). Also tested manually on one real mid-range Android and one iPhone before submission.
- iOS Safari specifics: unlock audio on first touch, `dvh` units, disable double-tap zoom with `touch-action`, no `navigator.vibrate` (feature-detect), test in Low Power Mode.
- Security headers on all responses (frontend via `vercel.json`, API via the Worker): `Content-Security-Policy` (self + self-hosted fonts; `connect-src` adds the Worker's https/wss origin), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

## 20. Share, metadata & submission assets
- `<title>Hop Brawl — Cross the road. Shove your friends.</title>`, meta description, Open Graph + Twitter card tags with `og-image.png` (1200×630 rendered from the game), voxel chicken favicon, `manifest.webmanifest` (name, icons, `display: standalone`, theme color Brawl Yellow).
- **Cover-image mode:** `/?cover=1` renders a hero shot (two animals mid-shove in a busy lane, logo, no HUD) at 1800×1200 for the Handshake cover image (3:2, ≥ 1200 px wide). Use the `screenshot` skill to export it.

## 21. Build order

| # | Milestone | Priority |
|---|---|---|
| 1 | Shared config, PRNG, worldgen (with solvability guarantees), hazards + unit tests | P0 |
| 2 | **Persistent-canvas architecture from day one** (§8.3): single scene, camera stations, UI layer + GSAP motion system, object pools, quality tiers (§19b), FPS/debug overlay | P0 |
| 3 | Input (touch/keys/mouse), hop animation, hazards, deaths, camera → **Solo playable**, with tile-flip retry | P0 |
| 4 | Worker + Room DO, create/join, lobby, clock sync | P0 |
| 5 | Server-authoritative movement, prediction, interpolation, shared camera | P0 |
| 6 | Hearts, respawn, shove, rounds, match, results screens | P0 |
| 7 | Deploy per §15a (server → Cloudflare, frontend → Vercel + custom subdomain); verify on a real phone + laptop; performance test (§19b) passing | P0 |
| 8 | Quick Play matchmaker + 60 s Solo prompt + rematch | P1 |
| 9 | Crates & boosts, awards, session scoreboard, emotes | P1 |
| 10 | Blender MCP models, biomes, lighting, particles; re-run performance test | P1 |
| 11 | Audio: menu loop, gameplay loops, SFX, announcer, continuous-music rules (§8.3) | P1 |
| 12 | Fighting-game UI layer (VS, K.O., banners), camera flights between screens, onboarding cues, How to Play, settings | P1 |
| 13 | Edge cases (§17), reconnect, versioning, accessibility, adaptive quality tuning | P1 |
| 14 | OG/meta, cover mode, gamepad, share result | P2 |
After every milestone: run tests, play-test with Playwright in phone + desktop viewports, screenshot each screen, check the FPS overlay, fix issues, redeploy.
**Deployment deferred (owner decision):** focus on development first. Milestone 7 (deploy) is executed **after milestone 13 and before milestone 14**, and **no later than 2026-10-26** (leaves 4 days before the Oct 30 deadline for fixing hosting issues). Until then everything runs locally with `npm run dev` + `wrangler dev` (which runs Durable Objects locally exactly like production). Keep the code deploy-ready throughout: server URL from `VITE_SERVER_URL`, CORS/Origin allow-list, hibernation — so M7 is only configuration and commands.
**Placeholder rule:** until milestone 10, use simple colored boxes with the correct sizes so gameplay and feel can be tuned early; models drop in without code changes (same origins/sizes).

### Tests (required)
- **Unit (vitest):** identical rows for the same seed; identical hazard positions for the same `(seed, z, t)`; slow-mo warp; shove resolution (success, blocked, cooldown, shove-proof, spawn-protected); edge cases #1–#9; round tie rule; match/showdown logic; awards; matchmaker pairing and timeout.
- **E2E (Playwright):** two browser contexts create/join a Private Room and play a full match with scripted inputs — both clients agree on round winners, match winner and awards. Quick Play pairing of two contexts. Solo run + retry. Mobile viewport (390×844, touch) and desktop (1440×900).
- **Latency:** repeat the 2-player E2E with 150 ms added latency and 2% packet jitter — no desync of results.
- **Performance:** §19b automated test (4× CPU throttle, mobile viewport).
- **Transitions:** Playwright records a trace going Home → Lobby → match → Match End → Rematch → Home; no frame > 50 ms during any transition.
- **Generator fuzz:** 1,000 random seeds × 300 rows each satisfy every solvability guarantee in §10.

## 22. Tools & skills Codex must use
- **Blender MCP** — build, view and export every model (§12). Fall back to headless Blender if MCP is unavailable.
- **Skills from `openai/skills`** (install with `$skill-installer`, restart Codex): `playwright`, `playwright-interactive` (play-testing, E2E, mobile touch), `screenshot` (visual checks + cover image), `cloudflare-deploy` (game server), `vercel-deploy` (frontend), `speech` (announcer voice lines), `security-best-practices` (review WebSocket handling before deploy).
- At the start of each milestone, check the available skills list and use any other skill that fits the task.

## 23. Tunables (`shared/config.ts`)

| Key | Value |
|---|---|
| COLUMNS | 9 |
| VIEW_ROWS | 13 |
| HOP_MS | 140 |
| MIN_HOP_INTERVAL_MS (server) | 100 |
| SWIPE_THRESHOLD_PX | 24 |
| TAP_MAX_MS | 250 |
| HEARTS_VERSUS / HEARTS_SOLO | 2 / 1 |
| RESPAWN_DELAY_MS | 1500 |
| SPAWN_PROTECT_MS | 2000 |
| SHOVE_STUN_MS | 300 |
| SHOVE_PROOF_MS | 1500 |
| SHOVE_COOLDOWN_MS | 2500 |
| SHOVE_KO_WINDOW_MS | 2000 |
| SCROLL_START_DELAY_S | 3 |
| SCROLL_SPEED | `min(0.25 + 0.012·t, 1.4)` |
| LEADER_MAX_AHEAD_ROWS | 8 |
| CAMERA_MAX_SPEED | 6 rows/s |
| TOP_LIMIT_ROWS | 11 |
| CRATE_CHANCE / CRATE_MIN_ROW | 0.25 / 8 |
| SHIELD_MS / SUPERHOP_MS / SLOWMO_MS | 8000 / 5000 / 3000 |
| SLOWMO_FACTOR / SLOWMO_RADIUS | 0.5 / 2 rows |
| TIE_WINDOW_MS | 200 |
| ROUND_CAP_S | 240 |
| ROUNDS_TO_WIN | 2 |
| MAX_PLAYERS_PRIVATE / QUICK | 4 / 2 |
| QUICK_PROMPT_S | 60 |
| QUICK_CONNECT_TIMEOUT_S | 10 |
| REMATCH_TIMEOUT_S | 20 |
| RECONNECT_GRACE_S | 10 |
| ROOM_EXPIRE_MIN | 5 |
| INTERP_DELAY_MS | 100 |
| SERVER_TICK_HZ | 20 |
| LOG_POS_HZ | 15 |
| RATE_LIMIT_MSGS_S | 30 |
| BIOME_LENGTH_ROWS / BLEND_ROWS | 40 / 4 |
| DIFFICULTY_FULL_ROW | 150 |
| PLAYER_HITBOX | 0.6 |
| VEHICLE_HITBOX_TRIM | 0.1 per end |
| LOG_LANDING_TRIM | 0.15 per end |
| MIN_ROAD_TIME_GAP_S | 0.6 |
| MAX_LOG_WAIT_S | 2.5 |
| EMOTE_COOLDOWN_MS | 2000 |
| SPEEDUP_TOAST_EVERY_S | 30 |
| LEADER_TOAST_MIN_GAP_S | 5 |
| FINAL_ROUND_MUSIC_RATE | 1.1 |
| CAMERA_FLIGHT_MS | 700 |
| TILE_FLIP_MS | 300 + 300 |
| MUSIC_CROSSFADE_MS | 1200 |
| LOBBY_IDLE_CLOSE_MIN | 30 |
| HOME_DIORAMA_SEED | 20261030 |

## 24. Definition of done
- Every item in §2 is true on the live URL.
- All three modes work end to end: Solo (with pause/retry), Quick Play (pairing, 60 s Solo prompt, rematch), Private Room (2–4 players, rematch, back to lobby).
- A full match plays start to finish on a real phone + a laptop, and with 4 browser tabs.
- All required tests in §21 pass, including the performance, transition and generator-fuzz tests.
- Stable 60 fps on desktop and mid-range phones; no visible stutter; every screen change is an animated transition with no blank frame.
- Menu music plays continuously across menu screens and crossfades into gameplay as specified in §8.3.
- Every edge case in §17 behaves as written. Nothing from §17a exists.
- No console errors or warnings in production.
- `README.md` (run, test, deploy), `DECISIONS.md`, `CREDITS.md` (every asset with URL + license) are complete.
- Cover image exported via `/?cover=1` (1800×1200).

## 25. Building in ChatGPT Work (overrides where it conflicts)

This project is built in **ChatGPT Work, running locally** on the owner's PC (project folder `C:\Users\zeidk\Desktop\game_challenge`). Some tools from §22 may not exist in Work. Use them if available; otherwise use these fallbacks. **Gameplay, feel, performance and $0 hosting requirements do not change.**

| Spec item | If Work can't do it | Fallback |
|---|---|---|
| Blender MCP models (§12.1) | No MCP / no Blender | **Node model pipeline:** `art/build-models.ts` (run with `npx tsx`) reads `/art/voxels/*.json`, builds meshes with interior faces removed, **bakes per-vertex ambient occlusion** (classic voxel AO: 3 neighbours per vertex corner, 4 levels), and exports `.glb` with `GLTFExporter` from three. Same sizes/origins/output folder as §12. This is now the **default** path; Blender is optional. |
| Playwright tests (§21) | No real browser automation | Keep vitest unit tests (pure Node). Replace E2E with a **Node bot test**: two scripted WebSocket clients play a full match against `wrangler dev` and assert identical results. Owner does visual checks in two windows (normal + incognito) and on a phone. Performance test: owner runs the in-game `?debug=1` FPS overlay + a built-in 60 s **benchmark mode** (`?bench=1`: auto-plays scripted hops, then shows p95 frame time and worst frame on screen). |
| Screenshots (§20 cover) | No screenshot tool | Owner opens `/?cover=1` and takes a screenshot at 1800×1200 (browser devtools device mode). |
| Downloading CC0 sounds/music (§14) | No internet downloads | Work gives the owner an exact list: pack name, URL and which files to copy into `client/public/sfx` / `music`. Missing SFX are **generated in code** with a jsfxr-style synth script (`art/build-sfx.ts`, outputs `.wav` → kept as `.wav` if no encoder is available). |
| Announcer voice (§14.1) | No text-to-speech | Use announcer clips from a CC0 voice pack if one has the lines; otherwise play no voice, and keep the text slams + a punchy SFX hit. |
| Deploy (§15a) | Can't log in to Cloudflare/Vercel | Work prepares everything and gives the owner **copy-paste commands** to run in a terminal: `npx wrangler login`, `npx wrangler deploy`, `npx vercel login`, `npx vercel --prod`, plus the env var and DNS steps. Running these commands is the owner's only manual step. |
| Git commits / push (§26) | No terminal git | Git is **required**. If Work can't run git itself, after every task it prints the exact `git add … && git commit -m "…"` commands for the owner to paste, and the push command at each milestone. |

**Session handoff (Work sessions can't hold the whole build in memory):**
- Maintain `PROGRESS.md` at the project root: completed milestones, current milestone, known bugs, the next exact step, and commands to run the project. Update it at the end of every milestone and before any long pause.
- Every new Work session starts by reading `SPEC.md`, `PROGRESS.md` and `DECISIONS.md`, then continues from "next exact step".
- Never rewrite working files from memory; read them before editing.

## 26. Git & GitHub ("commit maxing")

- **Remote:** `https://github.com/zeidkazi/hop-brawl.git` (branch `main`). First steps: `git init -b main`, add `.gitignore`, `git remote add origin https://github.com/zeidkazi/hop-brawl.git`, first commit `docs: add game spec` (SPEC.md), push.
- **Commit after every small, working unit of change**: one feature piece, one fix, one asset batch, one test file, one config tweak. Typical size: 1–5 files. Never batch a whole milestone into one commit. Expect dozens of commits per milestone.
- Every commit must leave the project **building and tests passing**; work in progress goes behind a flag or isn't committed yet.
- **Message format (Conventional Commits):** `type(scope): summary` in imperative mood, ≤ 72 chars, then an optional body explaining *why*.
  - types: `feat`, `fix`, `perf`, `refactor`, `test`, `style` (visual/CSS), `art` (models), `audio`, `docs`, `build`, `ci`, `chore`
  - scopes: `world`, `hazards`, `player`, `input`, `camera`, `net`, `room`, `matchmaker`, `ui`, `hud`, `solo`, `audio`, `art`, `perf`, `deploy`, `config`
  - e.g. `feat(input): decide swipe direction at 24px travel`, `perf(world): pool row meshes by row type`, `fix(net): bounce back on rejected predicted hop`
- Every commit includes the trailer line: `Built-with: ChatGPT Work (GPT-6 Astra)`.
- **Push** after every milestone and at least every ~10 commits (keeps a public, timestamped build history).
- **Tag** each finished milestone: `git tag m1-worldgen`, `m2-architecture`, `m3-solo`, … then `git push --tags`. Final submission tag: `v1.0.0`.
- Update `PROGRESS.md` in the same commit that finishes a milestone (`docs(progress): complete m3 solo`).
- **Never commit:** `node_modules/`, `dist/`, `.wrangler/`, `.vercel/`, `.env*`, `.dev.vars`, logs, OS files, Blender autosaves (`*.blend1`). No secrets or tokens anywhere in the repo.
- **README.md** on GitHub: title + tagline, cover image, live link, how to play, features, tech stack, local run (`npm install`, `npm run dev`, `npm run dev:server`), tests, deploy, credits link, and a line "Built with ChatGPT Work (OpenAI) for the Handshake AI Skills Studio Multiplayer Game Challenge."
- **Vercel ↔ GitHub:** connect the Vercel project to this repo so every push to `main` auto-deploys the frontend (preview deploys for other branches). Root/build settings: build `npm run build:client`, output `client/dist`, env `VITE_SERVER_URL`. The Cloudflare server is deployed with `npx wrangler deploy` at milestones (server before frontend, §15a).

## 27. Setup preflight (the agent runs this before milestone 1)

Run each check, fix what you can, and give the owner exact instructions for anything only they can do. Report the result as a checklist. Do not start milestone 1 until every item is ✅.

| # | Check | Command | If it fails |
|---|---|---|---|
| 1 | Node.js LTS (≥ 20) | `node -v` and `npm -v` | Owner installs Node.js LTS from nodejs.org, restarts the app |
| 2 | Git installed | `git --version` | Owner installs Git for Windows (git-scm.com) with default options (includes Git Credential Manager) |
| 3 | Git identity | `git config --global user.name` and `git config --global user.email` | Ask the owner for their name and email (suggest GitHub's private `…@users.noreply.github.com` address from GitHub → Settings → Emails, because the repo is public), then set them with `git config --global user.name "<name>"` and `git config --global user.email "<email>"`. Never write the email into any project file. |
| 4 | Default branch | `git config --global init.defaultBranch` | `git config --global init.defaultBranch main` |
| 5 | Line endings (Windows) | `git config --global core.autocrlf` | `git config --global core.autocrlf true`, and add `.gitattributes` with `* text=auto eol=lf` and binary rules for `*.glb *.png *.jpg *.wav *.mp3 *.ogg *.m4a *.woff2` |
| 6 | Remote repo exists and is empty | `git ls-remote https://github.com/zeidkazi/hop-brawl.git` | Not found → owner creates it on GitHub (no README/license/.gitignore). Not empty → stop and ask the owner before doing anything. |
| 7 | Repo initialised | `git status` in the project folder | `git init -b main`, `git remote add origin https://github.com/zeidkazi/hop-brawl.git` |
| 8 | First commit + push | commit SPEC.md (`docs: add game spec`), then `git push -u origin main` | A browser window opens for GitHub sign-in (Git Credential Manager): tell the owner to approve it, then retry. |
| 9 | Cloudflare login (needed at milestone 7, check now) | `npx wrangler whoami` | Owner runs `npx wrangler login` and approves in the browser (free account, no card). |
| 10 | Vercel login (needed at milestone 7, check now) | `npx vercel whoami` | Owner runs `npx vercel login` and approves in the browser (free Hobby account, no card). |
| 11 | Ports free for local dev | Vite 5173, wrangler 8787 | Use the next free port and update `ALLOWED_ORIGINS` for local dev |

Items 9–10 may be postponed to milestone 7 if the owner prefers, but must be listed as pending in `PROGRESS.md`.

## 28. Art & UI direction correction (after M2 review — overrides §8.1, §8.2 #3, §12.1, §25 where they conflict)

### 28.1 Blender is mandatory for every 3D asset
- The owner installs Blender (free, blender.org). Work drives it **headless from the terminal**: `blender -b -P art/build_models.py -- <args>` (no MCP needed). The Node voxel pipeline in §25 is **removed** as a fallback.
- All models — animals, vehicles, props, crate, **and the HOP BRAWL logo** — are built in Blender (voxel style per §12), with baked AO, exported as `.glb`. `.blend` sources committed in `/art`.
- For each model, Work renders a **preview PNG** from Blender (`art/previews/<name>.png`, 3/4 view, transparent background) and shows them to the owner for approval in batches.

### 28.2 No pixel font, nothing blurry
- **Remove Pixelify Sans.** Display font: **Lilita One** (`@fontsource/lilita-one`, OFL) for buttons, banners, numbers. Body: **Nunito** 700/800.
- **Dynamic resolution never runs on menu screens** — menus always render at the full tier pixel ratio. Dynamic resolution only applies during PLAYING.
- No `image-rendering: pixelated`, no upscaled low-res canvases, no bitmap text. Everything crisp at any DPR (test at 100 %, 125 %, 150 %, 200 %).

### 28.3 No edges, no void
- Canvas is `position: fixed; inset: 0`, sized to integer device pixels; `html`, `body` and every overlay background are transparent or the **current sky color**, so a 1-px rounding gap can never show white. Test at DPR 1.25 and odd window sizes.
- The 3D world must always fill the screen with real scenery: no flat grey/blank background on any screen. Sky = gradient per biome (§12.3), fog matches sky.

### 28.4 Home screen layout (replaces §8.2 #3)
The 3D scene **is** the menu. UI is minimal and sits on top without covering the world.
- **Scene:** a lit Meadow diorama in gameplay perspective — a grass strip in the middle with your animal idling (blinks, bob, occasional hop in place), a live road above and below with traffic passing, a river with logs in the distance, trees on the sides. Soft shadows. Camera drifts slowly.
- **Logo:** the Blender **3D voxel "HOP BRAWL" logo** stands *in the world* in the upper third (two lines, "HOP" white/cream, "BRAWL" yellow with dark outline voxels), drops in with a bounce on load, then bobs gently. Not HTML text.
- **Animal select:** tap/click the animal (or the ◀ ▶ arrows floating next to it in the scene, rendered as small 3D voxel arrows) to cycle animals; old one hops out, new one hops in. Animal name appears on a small in-world wooden signpost next to it.
- **Name:** small pill top-left: "✎ {name}" (tap to edit in a compact sheet). If empty: "✎ Tap to set name".
- **Primary actions (bottom, over a soft dark gradient so text reads):**
  - Portrait: one big **PLAY** button (Brawl Yellow, full width minus 32 px), and under it two equal buttons **FRIENDS** (green) and **SOLO** (blue).
  - Landscape/desktop: the three buttons in a single centered row at the bottom (PLAY widest).
  - PLAY = Quick Play.
- **Top-right:** round icon buttons — **?** (How to Play), **⚙** (Settings). Credits lives inside Settings.
- No panels, cards or boxed forms on Home. Max 3 primary buttons visible.
- Buttons: chunky 3D look (§8.1), Lilita One, white text with dark outline on colored buttons, bounce on hover/press.
- Keyboard: Enter = PLAY, ←/→ = change animal, S = Solo, F = Friends.

### 28.5 All other screens
- Same rule: the scene stays visible and alive; UI is a bottom sheet or a centered card **only when input is needed** (join code, settings, results), with the slanted fighting-game banners from §8.1 for titles.
- Before implementing any screen, Work takes a screenshot at 390×844 and 1440×900 and shows the owner for approval.

## 29. Visual identity: "Street Brawl", not a crossing-game clone (overrides §12, §28 where they conflict)

Goal: at a glance, nobody should mistake Hop Brawl for another voxel crossing game. Gameplay stays identical; only the look changes.

### 29.1 Brawler characters
- Every animal wears **boxing gear**: oversized voxel **boxing gloves** in the **player's color** (§8.1: coral / blue / green / purple; menus use coral), and a **headband** (white with a player-color stripe). Gloves replace front paws/wings visually; they swing on hops and punch forward on shoves.
- Gloves and headband are separate meshes recolored at runtime by player color (one model per animal, not one per color).
- **Default/mascot animal: the fox** (not the chicken). Home shows the fox first, and the logo mascot is the fox in gloves. The chicken remains selectable.

### 29.2 Toon outline style
- All characters, vehicles, crates, trains, logs and the logo get a **dark outline** (inverted-hull method: back-face shell scaled ~3 %, color Ink #1B1B2F). Medium tier: outlines on characters, vehicles and logo only. Low tier: characters only. Matches the UI's dark-outline style.
- Lighting: stronger key light + cool rim light from behind (the silhouette pops), warmer and more saturated palette, deeper contact shadows.

### 29.3 New palette (replaces Meadow in §12.3; adjust the other biomes in the same direction)
| Element | Color |
|---|---|
| Grass A / B (alternating rows) | `#6CCB5F` / `#5DBB52`, with small voxel grass tufts and flowers scattered |
| Road | warm charcoal `#3A3540` with **yellow** dashed lane lines `#FFD23F` and kerb stripes (red/white) at row edges |
| River | turquoise `#2EC4D6` with white foam at log ends |
| Sky gradient | `#7FD3FF` → `#FFE9C7` (warm horizon) |

### 29.4 Arena roadside (decorative columns outside 0..8)
- The road is a **street-brawl event**: instead of only trees at the sides, alternate **voxel crowd bleachers** (small blocky spectators in mixed colors that bob idly and jump + cheer on any K.O.), **festival bunting flags** strung between posts, **traffic cones and barriers**, and an occasional **stadium spotlight tower**. Trees still appear as grass-row obstacles inside the playfield.
- Per biome variants: autumn = hay bales + pumpkins by the bleachers; snow = snowy bleachers + scarves on spectators; night city = neon signs + spotlights switched on.
- All instanced; crowd animation is a cheap vertex/instance bob, no per-spectator logic.

### 29.5 Logo
- Strong contrast is mandatory: **thick dark Ink outline** (inverted hull or backing plate), saturated Brawl Yellow `#FFD23F` face with highlight, never pale. Must read clearly over grass, road and sky.
- Mascot on the logo: the **fox in boxing gloves** (replaces the chicken).

### 29.6 Animal select direction
- ▶ (next): current animal hops **out to the left**, new animal hops **in from the right**.
- ◀ (previous): current hops **out to the right**, new hops **in from the left**.
- Swipes follow the same direction as the finger. Keyboard ←/→ match the arrows.

### 29.7 Boxer gear & moves (final model pass — overrides §29.1 where it conflicts)
**Gear**
- **No headbands.** Remove them from all animals.
- **Floating gloves** (cartoon style, no arms), one per side, separate meshes with the pivot at the wrist, recolored by player color.
- Glove shape (voxel): rounded fist (corners chamfered by 1 voxel), a **thumb bump** on the inner side, a **white wrist cuff** (1–2 voxel band), a lighter **highlight voxel** on the top front, knuckle ridge on the front face. Each glove ≈ **45 % of the head width**.
- **Guard pose** by default: gloves beside the chin, slightly forward and apart; **the face (eyes, nose/beak/snout, mouth) must stay fully visible** from the gameplay camera and the 3/4 preview.

**Moves (procedural, on the glove nodes + body)**
| When | Move |
|---|---|
| Idle (Home, Lobby, in-round standing still) | **Boxer bounce**: body bobs ~2×/s, gloves in guard sway slightly. Every 3–5 s (random) one flourish: **glove tap** (knock gloves together twice in front of the chest, tiny spark + "tock" sound), **1-2 combo** (left jab, right cross straight ahead, ~350 ms), or **shoulder shake**. |
| Hop | gloves swing back on take-off, forward on landing (follow-through) |
| Shove | **real punch**: the glove on the hop side extends ~0.4 tile into the victim, body leans in, impact star + hit sound at contact |
| Shoved / stunned | gloves fly up, body wobbles, dizzy stars |
| Countdown | everyone in guard; on "HOP!" all players do a glove tap |
| Round / match win | **victory pose**: both gloves raised overhead, bouncing; crowd cheers |
| Home: tap/click your animal | it throws a 1-2 combo at the camera (with a whoosh) |
| Animal select | new animal lands, then glove tap |
| Lobby: player joins | that animal does a glove tap |
- Respect Reduce Motion: flourishes off, bounce halved.

### 29.8 Fixes from Home review
- **Logo in-game must match the Blender preview**: Ink outline/backing plate visible, saturated yellow. Exclude the logo from fog, use an unlit or tone-mapping-free material so it's never washed out. Fox mascot on the logo **2.5× bigger**, sitting on top of the "O", wearing gloves.
- **Arena scale**: decorative structures within 2 columns of the playfield are **≤ 1.5 tiles tall**; bleachers sit ≥ 2 columns outside the playfield; spotlight towers max 1 per ~15 rows and never in the top 3 visible rows on Home. Nothing decorative may overlap the road or the logo from the camera's view.
- **Spectators**: chunkier voxel people (head, body, arms), ~1.5× current size, mixed shirt colors; idle bob; on K.O./win they raise both arms and jump.
- **Animal sign**: remove the in-world sign text; show the animal name in the UI under the animal (Lilita One, white with Ink outline). The 3D arrows get an Ink outline and full opacity.
- **Load time**: measure Home time-to-interactive on the production build (`npm run build` + preview) with a cold cache. Must be < 3 s on desktop; models load before the blur/gradient intro ends. Report the measured number.

### 29.9 Model sign-off checklist (Work must verify and report each item)
1. Lineup preview of all 6 animals (3/4 view) + the same lineup **at the in-game camera angle and distance** on the actual grass.
2. Every face fully visible in both views; every animal recognizable by silhouette.
3. Gloves read as boxing gloves (thumb, cuff, highlight visible) in both views.
4. Fox in all 4 player colors.
5. A 6-frame strip per move: glove tap, 1-2 combo, victory pose.
6. Logo preview and an in-game Home screenshot side by side — colors and outline must match.
7. Home screenshots at 390×844 and 1440×900.
8. All models closed geometry (no stray planes), total models < 2 MB, measured load time.

### 29.10 Loading screen (replaces §8.2 #1)
- **Tiny and instant:** the loading layer is inline HTML/CSS/SVG in `index.html` (< 15 KB, no external requests, fonts not required — uses an inline SVG wordmark), so it paints on the very first frame before any JS/model downloads.
- **Look:** sky gradient background (same as the Home sky, so there's no color jump), the HOP BRAWL wordmark as an inline SVG matching the 3D logo (cream HOP, yellow BRAWL, thick Ink outline), and below it **two SVG boxing gloves in coral** doing the **glove tap** on a loop (knock together → spring apart, 600 ms cycle, tiny spark on contact).
- **Progress:** a chunky rounded bar (Ink outline, Brawl Yellow fill) driven by **real bytes loaded** (models + fonts + required sounds), eased so it never jumps backwards or stalls visually. Small text under it rotates gameplay tips every 2.5 s: "Hop into a friend to shove them", "Last one hopping wins the round", "The leader can't grab ? crates", "Fall off the bottom and you lose a heart".
- **Exit transition (seamless into Home):** when everything is loaded and shaders are warmed up, the gloves do one big **punch toward the camera**, the loading layer splits diagonally and slides away (300 ms, easeInQuart) revealing the live 3D Home already rendering underneath; the 3D logo then drops in letter by letter (§29.5). No blank frame, no flash, no blur stage.
- **Fast loads:** if loading finishes in under 400 ms (cached), skip the gloves and progress bar; do only the diagonal reveal.
- **Slow loads:** after 8 s show "Still loading… slow connection" under the bar. On an asset error show "Couldn't load the game" + **Retry** button (re-fetches only the failed files).
- Respect Reduce Motion: no punch, the layer just fades (200 ms).
- Remove the current blurred-gradient intro.

## 30. M3 playtest fixes: readability, fair world design, logs, trains (overrides §4.2, §4.3, §10, §23 where they conflict)

### 30.1 Camera framing & playfield size
- Gameplay window becomes **9 columns × 11 rows** (`VIEW_ROWS = 11`, `TOP_LIMIT_ROWS = 10`, `LEADER_MAX_AHEAD_ROWS = 7`).
- **Portrait:** the 9 columns + 0.5 tile margin each side fill **≥ 92 % of screen width**.
- **Landscape/desktop:** fit the 11 rows to the screen height; the 9 playable columns must span **≥ 45 % of screen width** (measure and report). The player character must be clearly readable (≥ 48 px tall at 1440×900).
- Everything outside the 9 columns is clearly *not* playable (§30.2).

### 30.2 Clear boundaries
- Out-of-bounds tiles (x < 0 or x > 8) are rendered **30 % darker and 25 % desaturated** and sit 0.1 lower than playfield tiles.
- A continuous **boundary line** runs along x = −0.5 and x = 8.5 on every row: grass → low white-painted kerb (0.15 tall); road → solid white edge line; river → white foam strip; rail → gravel edge.
- Bonking the edge flashes a short translucent wall pulse on that boundary line + bonk sound.
- While riding a log within 1.5 tiles of a boundary: that boundary line pulses red and a "!" pops above the player.

### 30.3 Scenery must match the row
- Decorative props only appear on **grass rows** outside the playfield (trees, bleachers, bunting, cones, towers). Road rows outside the playfield: just road (optional cones ≥ 3 columns out). River rows: water + reeds/lily pads. Rail rows: track continues.
- **Never** a tree, rock or prop on a road, river or rail tile — inside or outside the playfield. Add a test that scans 1,000 seeds for this.
- Arena props (bleachers etc.) start ≥ 2 columns outside the playfield.

### 30.4 What you see is what kills you
- The rendered camera must match the logical `camZ` (smoothing lag ≤ 0.05 rows). **LEFT BEHIND triggers only when the player is visibly at/below the bottom edge** of the screen; the bottom row shows the red danger vignette (§9.2) before that.
- Add a test that renders the frame of every LEFT BEHIND death and asserts the player is at/below the bottom edge.
- Hidden tab / frame drops: when the tab becomes visible again or a frame gap > 250 ms occurs, Solo auto-pauses (versus resyncs). Camera never jumps the player off screen during a hitch.

### 30.5 World generator: segments with rules (replaces the per-row weights in §10)
The world is a sequence of **segments**; each segment is one type and spans several rows.
- **Types:** GRASS (breather), ROAD (lanes), RIVER (rows of logs), RAIL (tracks).
- **Hard rule:** every ROAD / RIVER / RAIL segment is preceded **and** followed by a GRASS segment of ≥ 1 row. No hazard type ever touches a different hazard type (never river → rail, road → river, etc.).
- **Difficulty tiers by row z** (all numbers in config):
  | Tier | Rows | ROAD lanes | Car speed (tiles/s) | RIVER rows | Log speed | Log length | RAIL | Grass breather rows | Max obstacles per grass row |
  |---|---|---|---|---|---|---|---|---|---|
  | T1 | 0–24 | 1–2 | 1.2–2.0 | 1 | 0.6–0.9 | 3–4 | none | 2–3 | 2 |
  | T2 | 25–59 | 2–3 | 1.5–2.6 | 1–2 | 0.7–1.1 | 3–4 | single track, first one at z ≥ 30 | 1–2 | 2 |
  | T3 | 60–119 | 2–4 | 1.8–3.4 | 2–3 | 0.8–1.4 | 2–4 | 1–2 tracks | 1–2 | 3 |
  | T4 | 120+ | 3–5 | 2.0–4.2 | 2–3 | 0.9–1.6 | 2–4 | 1–2 tracks | 1 | 3 |
- **Rest stop:** every ~20 rows insert a 3-row GRASS segment with no obstacles in columns 2–6 and doubled crate chance.
- **Roads:** no 3 consecutive lanes in the same direction; adjacent lanes differ in speed by ≥ 25 %; trucks from T2; the first road ever has 1 lane.
- **Rivers:** directions alternate per row; logs are always slower than the slowest car of the same tier; at every column a log arrives at least every 2.0 s; consecutive river rows guarantee a jumpable overlap window ≥ 0.5 s at least every 3 s.
- **Rails:** grass on both sides; the first rail of a run has 2 grass rows before it; train warning 2.0 s in T2, 1.5 s from T3; minimum 7 s between trains on a track.
- **Grass:** a guaranteed open **corridor** — at least 2 columns that are open on every row of the grass segment; rows directly next to a hazard segment have ≤ 1 obstacle.
- **Solo start:** auto-scroll begins 3 s after the player's **first hop** (not at HOP!); first 10 rows are T1 with only 1-lane roads.
- Fuzz tests (1,000 seeds × 300 rows) assert every rule above.

### 30.6 Logs: slot snapping (replaces the log landing rule in §4.2)
- Each log is divided into **1-tile slots**. When a hop lands on a river row, the player **snaps to the nearest slot** of a log if that slot's center is within **0.6 tiles** of the landing point; otherwise splash. (Forgiving, never "fell off the edge" when it looked like a hit.)
- While on a log the player's x = log position + slot index; left/right hops move one slot along the log, or off the log onto the next log's nearest slot / water by the same 0.6 rule.
- Landing is evaluated using the log position **at the moment the hop lands**, and the hop arc visually curves to the slot it will land on.

### 30.7 Trains & rails readability
- Rail rows have their own ground: gravel bed (grey-brown voxels), wooden sleepers every 0.5 tile, two steel rails — clearly a track, never asphalt.
- A warning-light post (Blender) at both playfield edges of every rail row; lights flash red + bell during the warning; the whole rail row tints red-pulsing during the warning.
- Train: engine + carriages from Blender, headlight glow, slight camera shake when passing within 2 rows.

### 30.8 Bugs found in playtest
- **Logo intro breaks under frame drops** (letters end up scattered/misplaced). All intro/UI animations must be time-based and always settle to their exact final pose; on tab visibility return or a frame gap > 250 ms, jump animations to their end state.
- **Name dialog leaves a faint ghost panel** after confirming. Overlays must reach opacity 0 and `display: none`/`visibility: hidden` after exit.

## 31. M3 playtest round 2 (overrides §30 where it conflicts)

### 31.1 Draw distance bug (critical)
- Rows currently render only ~3 rows ahead of the player, leaving most of the screen empty. **Every row inside the camera frustum must be rendered**, plus a buffer: stream rows `camZ − 4 … camZ + VIEW_ROWS + 10`. Generation happens ahead of time (≥ 10 rows beyond the top of the screen) so nothing ever pops in.
- Test: at rows 5, 35, 70 and 150 on 390×844 and 1440×900, assert no empty/unrendered ground anywhere on screen (sample screen pixels against the sky color).

### 31.2 Camera: angled 3/4 view, closer
- Back to an **angled 3/4 view**: pitch ~52°, yaw ~18° (lanes run slightly diagonal, more depth), but closer than the M2 camera.
- Player sits in the **lower third** of the screen (≈ 35 % from the bottom), so most of the screen shows what's ahead.
- Targets: portrait playfield ≥ 88 % of width; desktop ≥ 45 %; player ≥ 48 px tall at 1440×900. Rows visible ahead of the player: ≥ 7 on portrait and desktop.
- Make pitch/yaw/distance tunables in `config.ts` and expose them in the `?debug=1` panel so the owner can tune live.

### 31.3 Logs: more challenge, still fair
- **Forgiving log aim-assist (like classic crossing games):** a hop onto a river row lands on the **nearest log slot within 1.0 tile** of the straight-ahead landing point (prefer the slot closest to straight ahead; ties → the slot the log is moving toward). Only splash when no log slot is within 1.0 tile. Challenge comes from timing, speeds, directions, sinking logs and edge carry, never from pixel-precise landings.
- Log speeds: T1 0.6–0.9 (unchanged), T2 0.9–1.3, T3 1.1–1.7, T4 1.3–2.0 — always ≤ the slowest car of the tier.
- From T2: 2-tile logs appear (30 %); adjacent river rows always move in **opposite directions at clearly different speeds** (≥ 35 % difference), so timing matters.
- From T3: occasional **sinking logs** (15 %): a log that bobs, shows bubbles for 1.0 s, then sinks for 1.5 s and resurfaces — visible warning before sinking, never sinking while the only log in reach.
- Edge carry stays a real threat: the red edge warning (§30.2) remains.

### 31.4 Boundaries through the environment (replaces the painted lines in §30.2)
Remove the white boundary lines. The edge must be obvious from the world itself:
- **Grass rows:** a low hedge or white picket fence segment at x = −1 and x = 9, with the crowd bleachers and bunting starting just beyond — the crowd watches *from behind the fence*.
- **Road rows:** the 9 playable columns are a **zebra crossing** (wide, low-contrast white stripes); outside it is normal road. You "cross at the crossing".
- **River rows:** the playable water is open; beyond the edges, **reeds, rocks and lily pads** cluster at the boundary, and the water there is darker and calmer.
- **Rail rows:** **railway crossing posts with barrier arms** (raised) at both edges — the track crossing *is* the playfield.
- **Lighting:** the playfield sits in a soft "arena light" pool; outside is ~15 % darker via a smooth lighting gradient (no hard dark band). Keep desaturation subtle (≤ 10 %).
- Feedback stays: bonk shimmer at the edge, red pulse + "!" when a log carries you within 1.5 tiles of the edge.

### 31.5 Deadline scope (owner decision, 2026-10-15)
Deadline pressure: finish fast with fewer review stops.
- **Cut (do not build):** emotes (§4.11), gamepad, share-result button, session scoreboard, Showdown rounds (3–4 player tie after 3 rounds → highest total distance wins), per-biome crowd variants (biomes = palette + tree swap only), announcer voice (text slams + SFX only).
- **Keep:** Solo, Private Room 2–4, Quick Play 1v1 + 60 s Solo prompt, shove, hearts, crates/boosts, awards, rematch, music + SFX, loading screen, How to Play, settings.
- **New order:** M4 → M5 → M6 → **M7 deploy (by Oct 21)** → M8 → M9 → M10 (remaining props only) → M11 → M12 → M13. Deploying early is the priority so hosting problems surface with time to fix.
- **Review stops only:** after §31 (M3), after M6 (multiplayer playable locally), after M7 (live URL). Everything else continues without stopping; report briefly at each milestone.
- **Efficiency:** unit tests on every commit; full browser suite and screenshots only at milestone ends; keep reports short.

### 31.6 Core gameplay sound pass (pulled forward from M11; music stays in M11)
Sources: CC0 only — Kenney audio packs, Freesound (filter: CC0), OpenGameArt (filter: CC0); fill gaps with procedurally generated Web Audio / jsfxr-style sounds. Log every file in CREDITS.md. Howler (Web Audio), pre-decoded, max 16 voices, distance attenuation + left/right panning by world x relative to the player.

| Event | Sound |
|---|---|
| **Train warning (2.0 s / 1.5 s)** | crossing **bell "ding-ding" loop** from both crossing posts, starts with the red lights; low **rumble that grows** as the train approaches; **horn blast** 0.5 s before it enters the screen |
| Train passing | loud **whoosh + clatter** sweeping left→right (or right→left) with panning; light camera shake within 2 rows |
| Cars | soft **engine hum** per vehicle (car vs truck different pitch), audible only within ~3 rows; **honk** on a near miss (vehicle passes within 0.3 tiles) |
| River | gentle **water ambience** loop when a river row is on screen; **log "thunk"** on landing on a log; **bubbles** before a sinking log goes under |
| Hop | short **"boing/whoosh"** with 3 random pitch variants; slightly different pitch per animal |
| Bonk (tree/edge) | dull **thud** + tiny squeak |
| Deaths | FLATTENED: squash + crunch · SPLASH: splash · DERAILED: big impact + train horn · SWEPT AWAY: splash + whoosh · LEFT BEHIND: falling "whoop" |
| Crowd | low **crowd murmur** ambience from the bleachers (pans with them); **cheer** on NEW BEST and on K.O.s |
| Meadow ambience | light birds loop (biome-specific ambience swaps later) |
| Solo | countdown beeps + "HOP!" whoosh, NEW BEST jingle, game-over sting |
| UI | button click, back, toggle, panel open/close whoosh |
- Mix: SFX volume setting applies; hazards quieter than player sounds; the train bell and horn are always clearly audible above everything else (they are gameplay warnings).
- Sound obeys mute/volume settings and the autoplay unlock on first tap.

## 32. SHIP TODAY (owner decision, 2026-10-15 — overrides §21, §31.5 and every other section where it conflicts)

Goal: a live, playable multiplayer build submitted **today**. After submission the same URL keeps improving until Oct 30 (only stable builds get deployed).

### 32.1 Today's scope (in this exact order)
1. **Solo fixes from §31, minimal:** §31.1 draw distance (critical); §31.2 angled 3/4 camera with the player in the lower third (no debug sliders); §31.3 log aim-assist (1.0 tile) + T2+ speeds only (no sinking logs); keep the current painted boundary lines (skip §31.4).
2. **Private Room multiplayer (2–4 players), condensed M4–M6:**
   - Cloudflare Worker + Room Durable Object (hibernation in lobby), `POST /api/rooms`, `/ws/room/:code`, 4-letter codes, `?room=CODE` links, Copy link button.
   - Lobby: player list, animal pick, host START (≥ 2 players).
   - Same seed for all, shared server camera, server-authoritative hops/shoves with client prediction + 100 ms interpolation, clock sync.
   - 2 hearts, respawn + spawn protection, shove (stun, shove-proof, cooldown), best of 3 rounds (first to 2), Round End + Match End screens (winner, round wins), Rematch + Back to lobby.
   - Basic resilience only: host handoff, a player leaving mid-match = out (1 left → wins by forfeit), "Room not found" / "Room full".
3. **Home:** PLAY opens the Friends flow (Create / Join) — Quick Play is hidden for today. SOLO unchanged.
4. **Minimum sound:** train bell + horn, hop, splash, squash, bonk, shove punch, round win (CC0 Kenney/Freesound-CC0 or procedural). Everything else in §31.6 later.
5. **Deploy (single Worker):** serve the built frontend from the same Cloudflare Worker via Workers static assets (no Vercel, no DNS today) → one URL `https://hop-brawl.<account>.workers.dev`. Free plan, no card. Owner runs `npx wrangler login` once; then you run `npx wrangler deploy`.
6. **Verify live:** open the URL in a normal + incognito window and on a phone: create room, join by code, play a full best-of-3 match, rematch. Fix anything broken, redeploy.
7. **Cover image:** export a 1800×1200 PNG of a 2-player match moment (both animals, gloves, traffic, logo-free HUD) for the Handshake cover.

### 32.2 Deferred (after submission, same URL, in this order)
Quick Play + 60 s Solo prompt → crates/boosts → awards → environmental boundaries (§31.4) → sinking logs → full sound pass (§31.6) + music → biomes → Vercel + custom domain (§15a) → remaining polish/edge cases.

### 32.3 How to work today
- No review stops until the live URL works end to end; then stop and report: URL, what was tested, known issues.
- Unit tests for room/shove/round logic; skip screenshot sets except the cover image.
- Commit maxing continues (small commits, pushed regularly). Tag `v0.9-submission` on the deployed commit.
