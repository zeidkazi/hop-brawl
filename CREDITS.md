# Hop Brawl asset credits

M2.5 includes self-hosted Lilita One/Nunito fonts, approved Blender assets and original procedural scenery. Runtime/development packages retain their respective upstream licenses; this ledger tracks assets shipped with the game.

Every imported asset must have an individual file path, source URL and verified license recorded here before it is committed. Only CC0 or licenses requiring no attribution are permitted by the owner. Project-generated model and audio files will also be logged with their provenance when created.

## Shipped assets

| File / source module | Source URL / provenance | License |
|---|---|---|
| `art/fonts/LilitaOne-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/LilitaOne-Regular.ttf | SIL OFL 1.1; no in-game attribution required; redistribution notice in `art/fonts/OFL.txt` from https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/OFL.txt |
| `@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/lilita-one@5.3.0/files/lilita-one-latin-400-normal.woff2 | SIL OFL 1.1, no in-game attribution required; redistribution notice retained in `client/public/licenses/lilita-one.txt` |
| `@fontsource/nunito/files/nunito-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-700-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/nunito.txt` |
| `@fontsource/nunito/files/nunito-latin-800-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-800-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1; same included notice |
| `client/src/game/world-view.ts`, `client/src/game/home-scene.ts`, `client/src/game/sky.ts`, `client/src/game/particles.ts` | Original procedural colored boxes, ground and circle shadows created for Hop Brawl; no imported art | Original project geometry, no third-party attribution |

Font license text verified from the pinned packages. Lilita One and Nunito are bundled locally; no external font requests. Pixelify Sans is retired under §28.

## M2.5 Blender assets — final boxer/model sign-off pending

The animals, vehicles and props below are original voxel creations built in Blender 5.2.2 LTS. The two logo candidates use the licensed Lilita One font listed above, converted from Blender Text objects; they are rendered artwork, not redistributed font software. Original artwork and arrangements: **CC0 1.0 Universal**, no attribution required; see `art/LICENSE.md` and https://creativecommons.org/publicdomain/zero/1.0/legalcode . The font itself retains OFL 1.1. Preview files are transparent except the logo review on the owner-requested sky-blue background.

| Files | Source URL / original recipe |
|---|---|
| `art/home_controls.blend`, `client/public/models/home_controls.glb`, `art/previews/home_controls.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_menu.py ; original CC0 closed voxel arrows. Section 29.8 removes the old sign/text meshes; name labels now use the UI font above |
| `client/public/models/logo.glb` | Street Brawl revision; identical to `art/variants/logo_street.glb`, built from https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py using Lilita One (OFL notice above) |
| `art/logo_smooth.blend`, `art/variants/logo_smooth.glb`, `art/variants/logo_smooth.json`, `art/previews/logo_smooth.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; Lilita One font source above |
| `art/logo_blocks.blend`, `art/variants/logo_blocks.glb`, `art/variants/logo_blocks.json`, `art/previews/logo_blocks.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; actual Blender Blocks remesh of the same Lilita One text |
| `art/previews/logo-comparison.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; side-by-side native Blender renders |
| `art/voxels/chicken.json`, `art/chicken.blend`, `client/public/models/chicken.glb`, `art/previews/chicken.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/chicken.py |
| `art/voxels/frog.json`, `art/frog.blend`, `client/public/models/frog.glb`, `art/previews/frog.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/frog.py |
| `art/voxels/fox.json`, `art/fox.blend`, `client/public/models/fox.glb`, `art/previews/fox.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/fox.py |
| `art/voxels/penguin.json`, `art/penguin.blend`, `client/public/models/penguin.glb`, `art/previews/penguin.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/penguin.py |
| `art/voxels/pig.json`, `art/pig.blend`, `client/public/models/pig.glb`, `art/previews/pig.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/pig.py |
| `art/voxels/cat.json`, `art/cat.blend`, `client/public/models/cat.glb`, `art/previews/cat.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/cat.py |
| `art/voxels/car.json`, `art/car.blend`, `client/public/models/car.glb`, `art/previews/car.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/car.py |
| `art/voxels/oak.json`, `art/oak.blend`, `client/public/models/oak.glb`, `art/previews/oak.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/oak.py |
| `art/voxels/crate.json`, `art/crate.blend`, `client/public/models/crate.glb`, `art/previews/crate.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/crate.py |
| `art/voxels/hatchback.json`, `art/hatchback.blend`, `client/public/models/hatchback.glb`, `art/previews/hatchback.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/hatchback.py |
| `art/voxels/taxi.json`, `art/taxi.blend`, `client/public/models/taxi.glb`, `art/previews/taxi.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/taxi.py |
| `art/voxels/truck.json`, `art/truck.blend`, `client/public/models/truck.glb`, `art/previews/truck.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/truck.py |
| `art/voxels/train_engine.json`, `art/train_engine.blend`, `client/public/models/train_engine.glb`, `art/previews/train_engine.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/train_engine.py |
| `art/voxels/train_carriage.json`, `art/train_carriage.blend`, `client/public/models/train_carriage.glb`, `art/previews/train_carriage.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/train_carriage.py |
| `art/voxels/log.json`, `art/log.blend`, `client/public/models/log.glb`, `art/previews/log.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/log.py |

Earlier animal/vehicle geometry was approved before section 29. The Street Brawl gear, arena and gloved-fox logo now supersede the old Home appearance; final Home approval is pending. Older silhouettes document the original anatomy before boxing gear.

The following silhouette previews are original Blender renders of the same animal geometry, with black material on white. Each is also **CC0 1.0 Universal**, with the same license above.

| File | Source URL / original recipe |
|---|---|
| `art/previews/chicken-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/chicken.py |
| `art/previews/penguin-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/penguin.py |
| `art/previews/frog-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/frog.py |
| `art/previews/fox-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/fox.py |
| `art/previews/pig-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/pig.py |
| `art/previews/cat-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/cat.py |

## Street Brawl revisions

| Logo files | Source / license |
|---|---|
| `art/logo_street.blend`, `art/variants/logo_street.glb`, `art/variants/logo_street.json`, `art/previews/logo_street.png`, `client/public/models/logo.glb` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; smooth Lilita One, thicker Ink backing and gloved fox; original CC0 1.0 artwork, Lilita One OFL font notice above. Supersedes the runtime A/chicken copy; A/B review files remain archived. |

| Arena files | Source / license |
|---|---|
| `art/arena.blend`, `client/public/models/arena.glb`, `art/previews/arena.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_arena.py ; original CC0 1.0 closed voxel bleachers, spectator, bunting, cone, barrier, spotlight, tuft, flower, foam, hay, pumpkin, snowy bleachers, scarf and neon sign |

All six animal model/source/preview entries above now include original CC0 floating boxing gloves and white cuffs authored by https://github.com/zeidkazi/hop-brawl/blob/main/art/brawler_gear.py . Section 29.7 removes the headbands. One neutral-color GLB per animal supports all player colors at runtime.

| Preview file | Source / license |
|---|---|
| `art/previews/fox-player-1.png` | Same fox geometry with coral gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-2.png` | Same fox geometry with blue gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-3.png` | Same fox geometry with green gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-4.png` | Same fox geometry with purple gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/boxing-lineup.png` | Contact sheet of the six Blender renders above; original CC0 1.0 artwork |
| `art/previews/fox-team-colors.png` | Contact sheet of the four fox player-color renders above; original CC0 1.0 artwork |

## Final boxer review and generated feedback

| File / generated asset | Source URL | License |
|---|---|---|
| `client/src/game/boxing-feedback.ts`: synthesized tock, whoosh and punch-hit one-shots; contact and dizzy-star geometry | https://github.com/zeidkazi/hop-brawl/blob/a0771d7/client/src/game/boxing-feedback.ts | Original CC0 1.0; no recordings, downloads or third-party audio |
| `art/previews/signoff/lineup.png` | https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-models.mjs | CC0 1.0 contact sheet of original Blender renders |
| `art/previews/signoff/grass-lineup.png` | Same review script URL above | CC0 1.0 native runtime captures |
| `art/previews/signoff/silhouettes.png` | Same review script URL above | CC0 1.0 final Blender silhouettes |
| `art/previews/signoff/fox-colors.png` | Same review script URL above | CC0 1.0 Blender player-color renders |
| `art/previews/signoff/tap.png` | Same review script URL above | CC0 1.0 runtime pose strip |
| `art/previews/signoff/combo.png` | Same review script URL above | CC0 1.0 runtime pose strip |
| `art/previews/signoff/victory.png` | Same review script URL above | CC0 1.0 runtime pose strip |
| `art/previews/signoff/event-moves.png` | Same review script URL above | CC0 1.0 runtime guard/hop/punch/stun/shake captures |
| `art/previews/signoff/crowd.png` | Same review script URL above | CC0 1.0 runtime idle/cheer captures |
| `art/previews/signoff/logo-match.png` | Same review script URL above | CC0 1.0 original artwork; Lilita One font provenance above |
| `art/previews/signoff/home-desktop.png` | Same review script URL above | CC0 1.0 runtime capture; font provenance above |
| `art/previews/signoff/home-mobile.png` | Same review script URL above | CC0 1.0 runtime capture; font provenance above |
| `art/previews/signoff/measurements.png` | Same review script URL above | Original project measurement table; CC0 1.0 |

## Loading screen (§29.10)

| Asset | Source | License |
|---|---|---|
| Inline Lilita One SVG wordmark in `client/index.html` | [Project curve exporter](https://github.com/zeidkazi/hop-brawl/blob/main/art/build_loading_wordmark.py), derived from the Lilita One font credited above | SIL OFL 1.1 font; rendered wordmark artwork |
| Inline coral glove and spark SVGs in `client/index.html` | [Original project markup](https://github.com/zeidkazi/hop-brawl/blob/main/client/index.html) | CC0 1.0 |
| `art/previews/loading/transition.png`, `art/previews/loading/error.png` | [Production capture script](https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-loading.mjs) | Original project captures, CC0 1.0; font provenance above |

## Solo review captures (M3)

| Asset | Source | License |
|---|---|---|
| `art/previews/solo/desktop-countdown.png`, `desktop-playing.png`, `desktop-pause.png`, `desktop-over.png` | [Original runtime capture script](https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-solo.mjs) | Original project captures, CC0 1.0; existing model/font provenance above |
| `art/previews/solo/mobile-countdown.png`, `mobile-playing.png`, `mobile-pause.png`, `mobile-over.png` | [Original runtime capture script](https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-solo.mjs) | Original project captures, CC0 1.0; existing model/font provenance above |

## Section 30 rail warning post and review captures

| Asset | Source | License |
|---|---|---|
| `rail_post.glb`, editable `art/rail_post.blend`, voxel source and preview | [Original Blender recipe](https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/rail_post.py) | Original closed voxel geometry and baked colors, CC0 1.0 |
| `art/previews/playtest30/*-row*.png` | [Seeded gameplay review script](https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-playtest30.mjs) | Original runtime captures, CC0 1.0; existing font/model provenance above |

## Historical submission procedural sound (§32; replaced by Batch B)

| Sound | Source | License |
|---|---|---|
| Train warning bell and horn | [Original Web Audio synthesis](https://github.com/zeidkazi/hop-brawl/blob/a0771d7/client/src/game/boxing-feedback.ts) and [warning scheduling](https://github.com/zeidkazi/hop-brawl/blob/main/client/src/game/rail-sound.ts) | CC0 1.0 |
| Hop, water splash, squash, edge/tree bonk, shove punch, three-note round win | Same original Web Audio synthesis above; tunable oscillator/noise envelopes in shared/config.ts | CC0 1.0 |

These earlier sounds were generated in the browser, with no downloaded clips, external service, API key or attribution requirement. A user gesture unlocks audio; SFX volume applies to every cue; at most 16 voices play at once. Batch B below replaces this runtime synthesis with the predecoded CC0 sprite bank.

## Submission cover (§32.1 step 7)

| Asset | Source | License |
|---|---|---|
| `art/cover/hop-brawl-1800x1200.png` | [Original local multiplayer capture](https://github.com/zeidkazi/hop-brawl/blob/main/scripts/capture-submission.mjs), two real room clients using an authoritative shove | Original game artwork, CC0 1.0; font/model provenance above |

The revised cover is a 1800×1200 production-renderer screenshot of a server-confirmed shove: two animals, player-colored gloves, contact/stun stars and traffic. The capture hides the HUD/buttons/debug UI and places the existing approved 3D logo in the upper-left corner. The contact frame is frozen for capture; no gameplay geometry or authoritative state is fabricated. Capture metadata is in art/cover/capture.json.

The six HUD/result animal portraits, heart icons and win pips in client/src/ui/room-icons.ts are original inline SVG/CSS artwork, CC0 1.0, derived from the approved animal identities. No external image assets were downloaded.

## Historical announcer acquisition plan (deferred by §31.5)

Find one consistent, energetic voice for: "Round one", "Round two", "Final round", "Showdown", "Hop!", "K.O.!", "Winner!". Search free voice packs, including Kenney and CC0-filtered OpenGameArt/Freesound sources. Verify each file's license; free download alone is not license permission. Record missing same-voice lines and ask the owner to record them at M11. Until then use text slams and SFX. No announcer files have been selected or downloaded yet.

## Detail pass Batch A

- The broader fox tail is an original revision to `art/recipes/fox.py`, built and AO-baked in Blender into `art/fox.blend`, `art/voxels/fox.json` and `client/public/models/fox.glb`. CC0 1.0, same provenance as the original fox above; no downloaded assets.
- `art/review/batch-a/hop.png`, `log-landing.png`, `flattened.png` and `splash.png` are original six-frame game-renderer captures, CC0 1.0. `scripts/review-batch-a.mjs` records seeded collision/landing fixtures with controlled timestamps; it composites the captured frames without substituting artwork. Raw pose timestamps and fixture coordinates are in `art/review/batch-a/frames.json`.

## Detail pass Batch B audio (CC0 1.0)

The banks contain 44 named sound sprites and five music edits. All sources below are [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Rebuild with `node art/build-sfx.ts` (Python + the pinned ffmpeg encoder); `art/import_audio.py` downloads and SHA-256-verifies the source archives into ignored `tmp/`, selects the listed files, and converts them to mono PCM. No account, API key or attribution obligation. Individual offsets/durations are in `client/src/game/audio-manifest.json`.

| Source pack / author | Download and license evidence |
|---|---|
| Kenney Interface Sounds | [Pack + CC0 declaration](https://kenney.nl/assets/interface-sounds); [exact archive](https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip), containing `License.txt` |
| Kenney Impact Sounds | [Pack + CC0 declaration](https://kenney.nl/assets/impact-sounds); [exact archive](https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip), containing `License.txt` |
| extenz, Short kalimba loop | [Creator upload + CC0 declaration](https://opengameart.org/content/short-kalimba-loop); [exact Kalimba.wav](https://opengameart.org/sites/default/files/Kalimba.wav), SHA-256 `cc402dce63f6cb9235ac093e2f4d25dcf81f6d1f031a2fd3cc8e8738a5d9a568` |
| Juhani Junkala / SubspaceAudio, 5 Chiptunes (Action) | [Creator upload + CC0 declaration](https://opengameart.org/content/5-chiptunes-action); [exact archive](https://opengameart.org/sites/default/files/5%20Action%20Chiptunes%20By%20Juhani%20Junkala.zip), containing the author's CC0 declaration in `INFO.txt` |
| Original Hop Brawl procedural gap fills | [Editable synthesis source](https://github.com/zeidkazi/hop-brawl/blob/main/art/build-sfx.ts), dedicated to CC0 1.0. No sampled recordings or voice imitations. |

| Bank / individual sound | Exact source file or recipe | License |
|---|---|---|
| `client/public/sfx/brawl.mp3`: `click`, `back`, `toggle`, `open`, `close` | Kenney Interface archive: `Audio/click_001.ogg`, `back_001.ogg`, `switch_001.ogg`, `open_001.ogg`, `close_001.ogg`, respectively. Leading/trailing silence trimmed; loudness normalization and peak limiting, with 3 ms endpoint ramps. | CC0 1.0 |
| Same MP3: `punch`, `hit`, `tock`, `log` | Kenney Impact archive: `Audio/impactPunch_heavy_000.ogg`, `impactPunch_medium_000.ogg`, `impactSoft_medium_000.ogg`, `impactWood_light_000.ogg`, respectively. Same processing. | CC0 1.0 |
| Same MP3: `hop0`, `hop1`, `hop2`, `bonk`, `splash`, `squash`, `whoosh` | Original synthesis: three boing/whoosh variants, thud+squeak, water burst, squash+crunch, swing/swept-away. | CC0 1.0 |
| Same MP3: `bell`, `horn`, `train`, `rumble`, `car`, `truck`, `honk`, `water`, `bubbles` | Original synthesis: double crossing ding, train horn, rush/clatter, approaching rumble, car engine, low truck engine, near-miss horn, river loop, water bubbles. | CC0 1.0 |
| Same MP3: `fall`, `impact`, `crowd`, `cheer`, `birds` | Original synthesis: falling whoop, derail impact, stylized crowd murmur/cheer, meadow birds. | CC0 1.0 |
| Same MP3: `countdown`, `go`, `newBest`, `gameOver`, `roundWin`, `matchWin`, `respawn`, `heartLost` | Original synthesis: countdown beep, HOP slam/whoosh, 1.25 s new-best jingle, 2 s Solo sting, 2.5 s round sting, 5 s match fanfare, respawn and heart-loss cues. | CC0 1.0 |
| Same MP3: `grunt0`–`grunt5` | Original stylized synthesis: chicken cluck, frog ribbit, fox yip, penguin squawk, pig oink, cat meow. | CC0 1.0 |
| `client/public/music/brawl.ogg` and `.m4a`: `menu` | extenz: `Kalimba.wav`; first eight-bar kalimba/celeste/string phrase, measured 82 → 100 BPM. Replaces the rejected harsh Title Screen track. | CC0 1.0 |
| Same music banks: `meadow` | `Juhani Junkala [Retro Game Music Pack] Level 1.wav`; first eight bars, 90.5 → 130 BPM on the half-time beat grid. | CC0 1.0 |
| Same music banks: `autumn` | `Juhani Junkala [Retro Game Music Pack] Level 2.wav`; first eight bars, 105.5 → 130 BPM. | CC0 1.0 |
| Same music banks: `snow` | `Juhani Junkala [Retro Game Music Pack] Level 3.wav`; first eight bars, 105.5 → 130 BPM. | CC0 1.0 |
| Same music banks: `nightCity` | Same Level 3 source; contrasting eight-bar phrase starting at beat 64 (bar 17), 105.5 → 130 BPM. | CC0 1.0 |

Music edits preserve pitch, use exact whole-bar durations, mono downmix, and 5 ms boundary ramps to suppress clicks. Every music cue is two-pass BS.1770 normalized to about -20 LUFS; every effect to about -16 LUFS, with a -1.5 dBTP ceiling. Short effects repeat for at least three seconds during measurement, then retain their original runtime duration. Per-cue measurements are in `art/review/batch-b-stable/loudness.json`. OGG and AAC/M4A encode the same edited PCM; neither has a silent padding gap inside a looping sprite. The menu uses acoustic plucked instrumentation; the four gameplay tracks remain chiptunes. A common key is not claimed.

Announcer search: [Kenney Voiceover Pack (Fighter)](https://kenney.nl/assets/voiceover-pack-fighter), CC0, and its [creator-posted file inventory](https://opengameart.org/content/voiceover-pack-fighter-40-taunts) cover Round 1, Round 2, Final round and Winner, but lack Hop, Showdown and K.O. Searches of OpenGameArt/Freesound did not establish one CC0 voice covering all seven. No voice files are shipped. Per section 33, use text slams + SFX throughout; owner recordings remain an option for a later complete voice set.

Bubbles are shipped and used after splash deaths; sinking-log warning playback waits for Batch D's sinking-log mechanic. The four biome music arrangements are ready now; biome visuals/ambience swapping remain Batch E.

- `art/review/batch-b/flattened.png` and `art/review/batch-b/splash.png`: original six-frame 390x844 phone-viewport game captures, CC0 1.0; source https://github.com/zeidkazi/hop-brawl/blob/main/scripts/review-death-corrections.mjs. The manifest records actual animation times, seeded collisions and poses.
