# Hop Brawl progress

Last updated: 2026-10-15 (Asia/Calcutta).

## Local multiplayer playtest repairs (in progress; no deployment)

- Added monotonic life IDs, one server death-commit path and validated client reports. Every live player is simulated on the server, independent of browser frames. Regression tests cover idle players, both report/backstop orders, stale reports and respawn IDs. 137 unit tests and build pass.
- Local predicted deaths now animate immediately and report their life ID; confirmation owns the single toast/sound. Animation and confirmation gates reject repeated or older lives.
- Duplicate names now receive the first available numeric suffix, including collisions with already numbered names.
- Countdown/gameplay no longer focuses Leave. Window capture handles movement keys even over focused buttons, suppressing button activation and repeat hops; editable fields remain excluded.
- Toasts have a hard 2.5-second lifetime and are cleared, with timers cancelled, at round transitions and room exit. Historical snapshot events are not replayed into a new round.
- Non-host START is hidden with "Waiting for host..."; a lone host sees "Need 1 more player". Lobby names are capitalized, and its traffic uses a continuous clock independent of animal/join/leave updates.
- Tree canopies, including toon hulls, now fit inside grass rows with clearance from hazard kerbs. Arena footprint filtering also reserves this gap; the 1,000-seed/300-row scan checks outlined tree depth and both touching edges.
- Next: controls/lobby/toasts, scenery, results/HUD and replacement cover; then stop for owner playtest.

## Ship today: sections 31–32 (current, overrides historical gates below)

- Latest owner instruction (2026-10-15): complete steps 1–4 and cover step 7, verify everything locally including owner phone on Wi-Fi, then STOP. Do not deploy or wait for Cloudflare login. Keep the single-Worker static-assets/SQLite DO setup ready in wrangler.toml; the owner will log in and deploy afterward. No submission tag until there is a deployed commit.
- Step 1 complete: 64 recycled rows cover the angled camera frustum, lower-third player, 1.0-tile log-slot assist and T2–T4 log speeds. Painted boundaries remain. Desktop playfield 48.6%; phone 92.1%; player anchor 65% from top. Rows 5/35/70/150 have zero missing ground and at least seven rows ahead on both viewports. No screenshot sets generated.
- Step 2 complete locally: private-room authority, lobby, unique animal picks, player-colored gloves, clock sync, predicted local hops, 100 ms remote interpolation, hearts/respawn/protection/shove, three-round matches, rematch, host handoff and forfeit. 133 unit tests in 27 files and both client/server typechecks pass. Local Worker runs on 8787; Vite proxies API/WebSocket requests on 5173.
- Steps 2–4 checked: a complete three-round match, rematch, shove, host handoff, forfeit and Back to lobby passed between independent desktop/phone-sized browser contexts. Four-client admission, fifth-client ROOM_FULL, ROOM_NOT_FOUND, foreign-Origin rejection and first-time invite/name flow pass. PLAY opens Friends. Original procedural sounds cover bell/horn/hop/splash/squash/bonk/punch/round win.
- Camera/Solo/menu regressions: 16 targeted browser cases have passing results across desktop and mobile. Two old forced-death fixtures were updated for the new frustum and rerun successfully. No screenshot sets were exported. Desktop animal height is 76.9 px; real rendered Left Behind deaths remain below the visible screen and camera lag stays within 0.05 tile.
- Step 7 complete: art/cover/hop-brawl-1800x1200.png (1800×1200, 833,904 bytes), inspected after capture from two real local Worker clients. Both animals and gloves, traffic and the logo-free HUD are visible. Capture script/metadata and CREDITS entry are committed.
- Production-packaged local verification: all three multiplayer browser tests pass against http://127.0.0.1:8787, including the full three-round match and rematch. Frontend and room API are served by the same local Worker. This was local verification only, not a public deployment.
- Physical-phone live testing requires the owner's device. Automated touch/mobile tests are reported separately.

## Historical status (superseded by section 32)

- Completed milestones: M1 (world generation/hazards), M2 (persistent-canvas architecture), M2.5 (approved Street Brawl models/Home and section 29.10 Loading), M3 (Solo).
- Current phase: section 30 fixes are implemented and verified; STOP for another owner M3 playtest before M4. M3 is NOT approved. M2.5 remains tagged m2.5-art-direction. The original Solo report is historical; current review: art/review/PLAYTEST30.md, with six row 5/35/70 captures and raw fuzz/run/loading measurements.
- Owner approved the plan and M1 on 2026-10-14. Deployment is deferred until after M13 and before M14, no later than 2026-10-26; no deployment without the owner's pre-deploy approval.
- Read SPEC.md including section 30, committed as e675db9, docs(spec): add M3 playtest fixes. Section 30 overrides the prior movement/camera/generation rules. Owner's landable-slot wait interpretation is recorded in DECISIONS.md.
- Initial commit c6ec455 (`docs: add game spec`) pushed to `origin/main` at https://github.com/zeidkazi/hop-brawl.git.
- Owner's SPEC change committed as 7b4041c (`docs(spec): defer deployment milestone`).

## M3 section 30 fixes / awaiting owner playtest

- Scenery footprints match grass, arena setbacks enforced, obstacle canopies contained within one row. Exact rendered/logical camera bottom, danger/death alignment, hitch auto-pause, exact logo/UI settlement and ghost-dialog fix.
- Eleven-row camera and visible boundaries: desktop playable width 56.35%, fox 97.89 px tall; phone playable width 84.60%, or 94.00% with required half-tile margins.
- Tiered segments, grass separators, rest stops, corridors, road/river/rail schedules, first-hop scroll delay and actual-time log slot snapping/carry. Owner clarified the river limit as maximum wait for a landable slot; recorded in DECISIONS.md.
- Blender rail posts, gravel/sleepers/steel rails, warning flash/bell/row pulse, headlights and Reduce Motion-aware train shake. New original asset credited as CC0.
- 113 unit tests in 25 files plus typecheck/build pass. Full browser run passed 28/30; two obsolete streaming assertions were corrected and all four architecture cases passed on the final code. Thus all 30 cases have passing results; no known failing checks.
- Fuzz: 1,000 seeds × 300 rows, 154,396 segments, 25,732 adjacent river pairs, zero violations. Separate 1,000-seed scenery/segment audits pass. Review scripts drove real movement to rows 5/35/70 alive in both viewports, zero page errors. Six PNGs inspected.
- Production cold loading: median 1685.1 ms, maximum 1712.1 ms over five runs. Physical-phone feel remains owner-assisted. Original m3-solo tag remains historical; no gate is advanced or tag moved.

## M1 historical verification

- Exact package versions and npm lockfile; strict TypeScript, Vite, Vitest and Playwright setup.
- All §23 tunables in shared/config.ts, with generation/hitbox constants from §4/§10 in the same file.
- Mulberry32 and independent hash32 row seeds; generation supports arbitrary order and distant row indices.
- Grass, road, river and rail descriptors; safe starting rows, streak limits, deterministic crates, biome labels, difficulty limits, closed-ring traffic/log spacing.
- Time-based hazard positions, train warning/pass timing, union-based Slow-Mo, vehicle/train hitboxes, log landing trim, carried-off edges and the 50% hop hazard-row switch. Sampling functions reuse caller state and allocate no objects.
- npm run check passes: 33 unit tests in 9 files, including 1,000 random seeds × 300 rows (300,000 rows) covering every §10 solvability guarantee. Strict typecheck and production client build pass.
- npm run test:e2e passes: 2 Chromium tests, desktop 1440×900 and touch/mobile 390×844. Each compares complete descriptors/hazard results for 300 rows against Node in two independent browser contexts. No page/console errors observed in the primary context.
- Screenshots captured and inspected under ignored output/playwright/. M1 has only the unstyled Loading… shell; there is no playable scene or FPS overlay yet. These are not gameplay/performance test results.
- Started npm run dev at http://127.0.0.1:5173/ for the owner; restart with the command below if the process stops.

## M2 completed / verification

- One persistent WebGL2 canvas/renderer and world scene. Menus remain mounted over the animated fixed-seed diorama; History API handles sheets and room-link prefilling without page reloads.
- Reusable Catmull-Rom camera stations with 700 ms flights; critically damped scrolling follow, exact 9×13 perspective fit tested in desktop, portrait and landscape, debounced resizing. Later milestones connect gameplay/results to these stations and polish their presentation.
- Instanced colored-box terrain, props, vehicles, logs, animals and podium; 25 recycled row slots, 128 particle slots, two toast slots. Shared row generation runs outside rendering; animation is culled to visible rows. Bounds follow distant recycled rows and moving entities. Generic bounded pool available for later network snapshots.
- High/Medium/Low renderer paths, initial desktop High / touch Medium, manual Auto/High/Low settings, rolling-frame adaptive downgrade and dynamic resolution. High MSAA resolve preserves the canvas; Medium shadows cast only from animals/vehicles; Low uses blobs and animated flat-color water. All current shader variants warm before Home becomes interactive. Weather and Night City lights arrive with M10 art.
- GSAP overlapping/interruptible panel motion, 40 ms list stagger, button presses, carousel hop swap, pooled tile-flip/fade and toasts. Reduce motion disables drift and halves particles. Self-hosted fonts preload before Home; font files/licenses logged in CREDITS.md.
- Home, Friends sheet, basic Settings/How to Play/Credits layers exercise the architecture. Names, animal and settings persist with safe session fallback if storage is denied. Solo, Quick Play, Create Room and Join stay disabled until their gameplay/network milestones. Audio/haptics controls store preferences; their effects arrive in later milestones.
- `?debug=1` alone loads lil-gui and stats.js: camera station, graphics tier, camZ, menu visibility, tile flip, particle burst and toast controls; live frame/draw/pool metrics. Normal navigation does not import these tools.
- npm run check passes: 45 unit tests in 12 files, including the existing 300,000-row fuzz coverage, pool reuse, perspective fit, preferences and adaptive quality. Strict typecheck and production build pass.
- npm run test:e2e passes: 6 tests across desktop 1440×900 and touch/mobile 390×844 at device scale 2. Checks canvas identity, no console/page errors, rapid navigation, browser Back, settings, denied storage, deep links, quality changes, distant streaming, rotation, tile transitions and Node/browser deterministic parity. Geometry count stays 5, shader program count stays 16, row slots stay 25 after warm-up.
- Measured on local Intel Iris Xe via D3D11: Home desktop High = 13 draw calls / 7,262 triangles; mobile viewport Medium = 10 calls / 6,900 triangles, pixel ratio 1.5. Five-second diorama samples reported rolling p95 16.7–16.8 ms, worst 16.8 ms (about 60 FPS). This is host-GPU evidence, not real-phone or two-player performance certification. The initial SwiftShader desktop run missed the frame budget; the GPU backend is recorded in test metrics. Three.js now supplies soft filtering through PCFShadowMap; the removed PCFSoft API compatibility resolution is documented in DECISIONS.md.
- Main production JS approximately 179 KB gzip (below 400 KB), debug-only chunk approximately 10 KB gzip; three font files total approximately 41 KB. Vite emits its default 500 KB uncompressed-chunk advisory; the specified compressed budget passes. First interactive frame on actual 4G remains unverified.
- Desktop/mobile screenshots and JSON metrics are in ignored output/playwright/. Reviewed portrait framing: selected placeholder is above the mobile menu, and desktop leaves it visible beside the menu.

## M2.5 asset-preview checkpoint (not complete)

- Owner's full §28 committed as ac54a49, `docs(spec): add art and UI direction correction`.
- Verified Blender 5.2.2 LTS (`--version`, build hash d13f752e3b9c). `scripts/build-art.mjs` reads BLENDER_PATH from the environment / gitignored .env.local and invokes the mandatory headless Python pipeline. No machine-specific executable path is tracked; no Node meshing/export fallback exists.
- `art/build_models.py` now removes interior faces within each part and greedily merges coplanar faces of the same color. Fixed cross-part culling that left attachment surfaces open: eyes and tails now remain independently closed solids. Actual Cycles AO at 64 samples is baked onto the optimized mesh and exported as one-sided, texture-free GLBs with one material. Body origin bottom-center, 12 voxels/tile, glTF +Y up / forward -Z. Tails retain attachment pivots.
- Owner approved chicken, penguin and crate. Their recipes/voxel designs are unchanged; each optimized export was committed separately. Revised frog (single-voxel eyes/smile), fox (stepped pointed ears, narrow snout, visible bushy tail), pig (face eyes, forward floppy ears, curl), cat (tabby stripes, pointed ears, four legs, curved tail), car (flush cabin/four window walls/smaller wheels), oak (4-voxel trunk/14-wide canopy), and logo (connected R/two-voxel strokes/individual tilts) each have a separate revision commit. Each has a recipe, voxel JSON, editable .blend, GLB and transparent PNG.
- Black silhouette PNGs for ALL six animals were rendered from the same saved Blender cameras, inspected, and saved as art/previews/<animal>-silhouette.png. These are for owner recognition review; visual approval is not inferred from automated checks.
- Second owner review approved fox, cat, pig, frog and oak, so all six animals plus oak/crate are now approved. Sedan cabin lowered by two voxels, front windshield exposed, red blocks removed above the wheels. Built blue hatchback, yellow roof-sign taxi, cab/box truck, red/black engine, blue carriage and bark-ring log segment at §12.2 dimensions. Each vehicle/log is committed separately with recipe, voxel source, .blend, GLB and preview.
- Final owner direction replaced the entire bitmap logo. Built A smooth and B Blocks from actual Lilita One Blender Text objects, with 0.35 extrusion, 0.03 bevel, 70% HOP cap height, tight spacing, signed 3–6 degree tilts, <=5% height nudges and expanded dark backing plates. Chicken sits on O facing the viewer. No glove, starburst, road or dust. Old logo sources, export and storyboard were deleted.
- Both candidates retain packed font/editable Text sources in .blend, nine independent animation handles (eight letters plus chicken), separate eye mesh and texture-free opaque vertex colors with Cycles AO. A: 182,904 bytes. B: 162,248 bytes. Byte normals/colors use standard KHR_mesh_quantization; positions stay full precision. Both load successfully in the installed Three.js GLTFLoader without extra decoder code.
- B uses actual Blender Remesh Blocks, depth 5, then coplanar simplification. Reviewed raster cross-sections for all glyphs; core letter strokes are at least four blocks thick. Preview cameras are near-frontal (~10 degrees above/to the side), 1600x1000, #87CEFA background. Side-by-side file: art/previews/logo-comparison.png, A left / B right. Both candidates remain archived in art/variants; the selected A is also copied unchanged to the runtime logo.glb.
- Latest vehicle review approved car, hatchback, taxi, engine/carriage and log. Truck rear cab glass was replaced by a solid painted wall; removed the forward grey cargo trim. Its recipe, voxel JSON, .blend, GLB and preview were committed separately. All voxel source solids still pass exact volume/opaque-material checks.
- npm run check passes: 69 tests in 14 files, strict typecheck and production build. Tests include 15 voxel models plus two actual logo loader round trips, named hierarchy, opacity, normal precision, perch placement, file dimensions, font/layout metadata and <200 KB guards. Previous browser checks remain the M2 baseline; no Home runtime code changed during this asset revision. Lilita One font URL/OFL notice and every new artwork file are in CREDITS.md.

## M2.5 first Home review checkpoint (rejected; superseded by section 29)

- Owner chose smooth Lilita One logo A. Runtime logo is the unchanged 182,904-byte approved export, with sequential HOP/BRAWL letter drops, squash/stretch, chicken landing on O last, idle bob and blinking. Reduced motion bypasses the intro and idle movement.
- Home uses the persistent canvas and scene: approved Blender animals, instanced oak/traffic/logs, grass strip, roads above/below, river, sky gradient, slow camera drift. Six animal variants and sign labels load once and warm during Loading, including blinkable meshes. High/Medium use waves; Low uses animated flat water and blob shadows.
- Blender-authored arrows and wooden animal sign with Lilita One labels are exported from art/build_menu.py. No visible HTML logo or boxed Home form. Tap/click, arrows, swipe and keyboard cycle animals with hop-out/hop-in motion. Compact name editor, help/settings icons, bottom PLAY/FRIENDS/SOLO actions; Credits is inside Settings. Empty-name Friends opens the name editor and continues after a valid name.
- Pixelify Sans and its package/license removed. Lilita One and Nunito preload locally. Menus always use the full tier pixel ratio; adaptive resolution runs only while PLAYING. Physical canvas/render-target dimensions round up to integer pixels; page background matches sky.
- npm run check: 70 unit tests, strict TypeScript and production build pass. Complete runtime model library is 638,700 bytes including logo and controls, below 3 MB. Main JS is about 205 KB gzip, below 400 KB; fonts total about 43 KB. Vite's default uncompressed-chunk advisory remains; no runtime console errors observed.
- npm run test:e2e passes all 10 browser tests. They cover all six animals without additional model downloads or canvas replacement, name editing/validation, nested Settings/Credits/Back navigation, denied storage, persistent resources, shared determinism and viewport rotation. Odd 391x845, 1441x901 and 845x391 windows run at DPR 1, 1.25, 1.5 and 2 for both desktop and touch contexts, with full menu resolution and exact canvas coverage.
- Screenshots: output/playwright/home-review/desktop.png (1440x900 viewport), mobile.png (390x844 viewport, DPR 2). Reviewed locally; awaiting owner visual approval. The local dev server is at http://localhost:5173/ and http://192.168.7.7:5173/ on the same Wi-Fi.
- Five-second host-GPU samples: desktop High 50 draw calls / 132,050 triangles, touch Medium 40 calls / 72,746 triangles; rolling p95 about 16.7 ms. These measure Home on Intel Iris Xe, not real-phone or full-game performance.
- No M3 gameplay work started. PLAY/SOLO/Create/Join stay disabled until their implementation milestones. No deployment and no M2.5 completion tag before Home approval.

## M2.5 Street Brawl review checkpoint

- All six animals have separate closed voxel glove, headband and stripe meshes. Neutral AO colors plus runtime material tint support coral/blue/green/purple without duplicate character GLBs. Front paws/wings are visually replaced, glove pivots are at the wrists, and headbands sit flush above the eyes. Each animal revision is a separate tested commit.
- Preview sheets: art/previews/boxing-lineup.png (all six, coral) and fox-team-colors.png (four colors). Individual animal/player-color PNGs remain available. Geometry remains bottom-centered; added gear is cosmetic and does not change gameplay hitboxes.
- Inverted back-face hulls use Ink and 1.03 scale. High outlines characters/vehicles/props/logo; Medium characters/vehicles/logo; Low characters only. Hulls share instance buffers and cached geometry. Eight logo letter faces/backings merge once during loading; Low uses their prewarmed face-only geometry.
- Saturated Meadow palette, yellow dashes, red/white kerbs, turquoise water with instanced foam, warm horizon/cool sky, stronger key and cool rim light. Home layout widens to show the event roadside without covering the animal/sign.
- Blender arena kit contains bleachers, a blocky spectator, bunting, cones/barriers, spotlight tower, tufts/flowers/foam, autumn hay/pumpkins, snowy bleachers/scarves, and neon signs. Repeated props are instanced; spectators use shared shader time for idle bob and a K.O. cheer impulse. Decorations remain outside columns 0..8; grass-row trees remain inside, clear of the Home selection stage.
- Smooth Lilita One Street Brawl logo replaces the chicken with the gloved fox and thickens Ink backing to 11% of cap height. Full-precision positions and compact normals/colors keep the export at 155,892 bytes, below 200 KB. All letter/mascot animation handles remain independent; fox lands on O last and blinks while idle.
- Fox is the default for new/corrupt-storage sessions; a user's valid saved animal remains respected. Next exits left/enters right; Previous exits right/enters left; swipes follow finger direction and keyboard arrows match.
- Screenshots and browser metrics are under ignored output/playwright/home-review/. Final Home approval remains pending. No M3 gameplay or deployment work has started.
- Shove/K.O. presentation hooks are ready for the corresponding future gameplay events; no fake gameplay is introduced to exercise them. Runtime biome blending and full match event wiring remain in their scheduled gameplay/art milestones.
- Final validation: `npm run check` passes 82 unit tests in 16 files, strict typechecking and the production build. `npm run test:e2e` passes all 12 desktop/touch browser tests, including outgoing/incoming carousel signs, finger-direction swipes, crowd cheer lifetime, persistent resources and DPR 1/1.25/1.5/2 canvas coverage. No page or console errors in the final screenshot runs.
- Final screenshots: output/playwright/home-review/desktop.png at 1440x900; mobile.png at a 390x844 CSS viewport and DPR 2. Five-second host-GPU samples: desktop High 82 calls / 97,846 triangles, mobile Medium 73 calls / 89,122 triangles (below the Medium <80 target); rolling p95 16.7–16.8 ms. These are Intel Iris Xe browser measurements, not a real-phone or full-match performance certification. Menus remain at full tier resolution (Medium pixel ratio capped at 1.5).
- Runtime GLBs total 790,228 bytes, below 3 MB; main production JS is about 208 KB gzip, below 400 KB. Vite still emits its default uncompressed-chunk advisory. Dev server remains at http://localhost:5173/ and http://192.168.7.7:5173/ for the same-Wi-Fi phone review. No M2.5 completion tag until owner acceptance.

## M2.5 final boxer/model sign-off checkpoint

- Owner's sections 29.7–29.9 committed as 4267315, `docs(spec): add boxer moves and model sign-off`. All six final gear revisions are separately committed. Headbands removed; closed chamfered fist/thumb/highlight/ridge geometry, untinted white cuffs and independent wrist handles replace the former gloves. Original anatomy and gameplay hitboxes are preserved.
- Shared Boxer controller implements idle 2 Hz bounce, random 3–5 s tap/combo/shake flourishes, hop follow-through, side-selected 0.4-tile shove punch, stun/wobble/stars, countdown guard/HOP tap, victory/cheer, selection landing tap and lobby-join tap. Home tap now performs the 350 ms combo; arrows/swipes select. Reduce Motion disables automatic flourishes and halves bounce. Original synthesized contact/whoosh/hit feedback respects SFX volume and gesture unlock. Actual authoritative event sources remain in their gameplay milestones.
- Logo: 155,500 bytes, unlit/fog-free vertex colors matching the Blender preview, visible Ink backing on every tier, fox scaled 2.5x. Geometric audit found and fixed uncapped contours in the Text backing. Arrow-only controls remove 150,296 bytes of unused sign/text geometry; the animal name is outlined Lilita One UI text below the animal.
- Arena: inward-facing chunky spectators (1.5x former height) raise both arms and jump using shared shader uniforms. Bleacher bounds are 2.15 tiles outside the playfield; nearby structures reach at most 0.917 tile (<1.5); towers are 16 rows apart at Z=10/26, outside the top Home rows. The selection stage leaves room for victory gloves and dizzy stars below the logo.
- `npm run check` passes 87 tests in 17 files, strict typecheck and production build. `npm run test:e2e` passes all 12 desktop/touch checks. A first-use spark geometry upload was detected by the persistent-resource test and fixed by warming it during Loading, including portrait views. Resource counts now remain stable through navigation and tier changes.
- All 18 runtime GLBs pass `node scripts/audit-models.mjs`: zero open boundary segments, zero flat meshes, 643,416 bytes total (<2,000,000). Runtime plus archived variant GLBs total 1,144,068 bytes. Raw results: art/review/geometry-audit.json.
- Production preview cold-cache desktop TTI: 1.470 / 0.688 / 0.935 / 1.080 / 1.052 seconds; maximum 1.470 s, median 1.052 s (<3 s). All 15 Home models load before interactivity. HTTP cache is cleared/disabled and each run uses a new browser context. This is local production preview on Intel Iris Xe, not deployed-network or real-phone certification.
- Final production samples: High 82 draws / 88,848 triangles; Medium 75 draws / 81,470 triangles. Rolling p95 16.7–16.8 ms after five seconds. No page/console errors. Evidence: art/review/browser-measurements.json and all 13 PNGs under art/previews/signoff/ (both lineups, silhouettes, four colors, three six-frame strips, other event poses, cheering crowd, logo comparison, two Home screenshots and measurements).
- Local dev remains http://localhost:5173/ (phone: http://192.168.7.7:5173/). Production preview is http://localhost:4173/. No M3 work, deployment or M2.5 completion tag before final owner sign-off.

## M2.5 Loading completed

- Section 29.10 committed as docs(spec): add loading screen. Inline 12,225-byte HTML/SVG/CSS first paint, actual byte progress, rotating tips, glove tap, punch/diagonal reveal into live Home, slow/error/retry and Reduce Motion cases replace the old blurred intro.
- Six-frame transition and error evidence: art/review/LOADING.md. At the M2.5 tag, five cold local production loads had median 1.597 s and maximum 2.532 s. M3's later asset set is measured separately in art/review/SOLO.md.
- Tag m2.5-art-direction pushed at 753bd8c after owner model sign-off and Loading completion.

## M3 completed / verification

- Shared 140 ms hops, one-input buffering, obstacles/edge/top bonks, continuous fractional log carry, safe log-exit rounding, half-hop hazard-row switch, fixed collision substeps, and auto/follow camera rules.
- Pointer movement accepts one swipe immediately at 24 px; taps/clicks hop forward. Keyboard repeat is ignored. UI clicks do not hop. Blur/hidden tab pauses Solo.
- Approved Blender animals, traffic, trains, oak and logs reuse the warmed scene; pooled rows/particles and tiered rendering remain. Gameplay exposes the same 13 rows on phone and PC, with decorative ground beyond them.
- Three-second initial/resume countdown, one-heart deaths with specific presentation, material desaturation, local best and BEST flag, new-best burst, Pause/Settings/Resume/Restart/Quit, and one-second Retry countdown overlapping the pooled tile flip. Canvas identity is preserved.
- 100 unit tests, strict typecheck and production build pass. Full desktop/touch browser suite passed 24/24; targeted final Solo/architecture checks are recorded in art/review/SOLO.md. Screens and host-GPU frame/startup measurements are in that report.
- Crates/boosts remain M9, remaining biome art M10, full audio M11 and onboarding/presentation polish M12. No multiplayer or deployment work starts before the owner approves M3.

## Setup preflight (§27)

M2.5 update: portable Blender 5.2.2 LTS verified with `--version`. Its machine-specific path is stored only in gitignored `.env.local` as `BLENDER_PATH`; `npm run art:build -- --version` verifies the launcher. Blender is mandatory for all 3D assets; the former Node fallback is removed from the implementation plan.

1. PASS: Node v24.21.0 (24 LTS line), npm 11.19.0.
2. PASS: Git 2.51.0.windows.1 installed.
3. PASS: Global Git name and email configured; no email value written to project files.
4. PASS: Global init.defaultBranch set to main.
5. PASS: Global core.autocrlf set to true; .gitattributes enforces LF text and marks the specified asset extensions binary.
6. PASS: git ls-remote succeeded with zero refs before initialization; the prescribed remote was empty.
7. PASS: Repository initialized on main with the prescribed origin.
8. PASS: Initial spec/setup commit pushed successfully; main tracks origin/main.
9. PENDING UNTIL M7: Wrangler 4.150.0 whoami reports unauthenticated. Owner command: npx wrangler login; approve the browser sign-in using a Workers Free account with no card, then verify npx wrangler whoami.
10. PENDING UNTIL M7: Vercel CLI 64.0.2 whoami reports logged out and a worker timeout/EPIPE. Owner command: npx vercel login; approve the browser sign-in using a Hobby account with no card, then verify npx vercel whoami. Recheck the CLI worker error then if it persists.
11. PASS: Ports 5173 and 8787 both successfully bound and released; temporary HTTP check on 127.0.0.1:5173 returned 200 and was stopped.

## Tool availability / Work fallbacks

- Yes: terminal, Git (including push), project file writes, local dev servers, npm package downloads/execution, browser automation, internet downloads.
- Browser automation: Playwright 1.64.0 and Chromium installed; M1 browser parity checks pass. Full-match, latency, performance and transition tests remain for the relevant milestones.
- Yes: Blender 5.2.2 LTS, driven headlessly through the terminal under §28.1. No Node voxel fallback.
- No usable TTS: at M11 search for one consistent energetic voice with all seven owner-requested lines, licensed CC0 or no-attribution-required; log every file URL/license in CREDITS.md. Report missing same-voice lines so the owner can record them. Use text + SFX until then.
- Installed official skills: playwright, playwright-interactive, screenshot, cloudflare-deploy, vercel-deploy, speech, security-best-practices. Playwright skill used for M1; read applicable instructions before using the others.
- Restricted-shell network/localhost operations and Git index writes required approved elevated execution and then succeeded.

## Known bugs / unresolved checks

- Models/Home are signed off. Solo and Private Rooms are enabled. Physical-phone verification on the owner's Wi-Fi is still pending; automated mobile viewports do not certify actual device performance.
- M12 owner polish notes (do not implement early): make 1–2 combo punches visibly travel toward the gameplay camera; improve the fox tail silhouette from that camera.
- On Windows, a production rebuild can invalidate Wrangler's asset-directory watcher. Restart npm run dev:server after rebuilding client/dist. This is a local tooling limitation; the Vite frontend stays current without production rebuilds.
- Full two-player transition traces, 60-second 4× CPU-throttled gameplay, GC-pause analysis and real-device performance remain for the gameplay/network milestones and pre-deployment validation. Current FPS numbers cover only Home on the host GPU.
- No deployment was performed and v0.9-submission was not tagged. The owner will handle Cloudflare login/deployment later; Vercel/DNS are outside today's scope. Worker packaging dry-run succeeds with static assets and the SQLite DO binding.

## Next exact step

Await the owner's full match/rematch check from a normal window, incognito and phone at http://192.168.7.7:5173/ on the same Wi-Fi. Local implementation, automated verification and cover are complete. STOP; do not deploy. Fix only any reported bugs, with focused checks and commits. Do not implement deferred M12 punch/tail polish.

## Milestone plan / gates

- M1: Shared config, PRNG, worldgen, hazards, unit/fuzz tests. COMPLETE.
- M2: Persistent canvas/scene, camera stations, GSAP UI motion, pools, quality tiers, debug overlay. COMPLETE; tag m2-architecture.
- M2.5: Blender-only pipeline and art/UI direction correction plus loading. COMPLETE; owner models/Home approved; tag m2.5-art-direction.
- M3: Responsive controls, hopping, hazards/death, camera, Solo and tile-flip retry. COMPLETE; STOP for owner testing/approval.
- M4: Worker + hibernating Room DO, create/join, lobby, clock sync.
- M5: Authoritative movement, prediction, interpolation, shared camera.
- M6: Hearts, respawn, shove, rounds/matches, results.
- M8: Hibernating Quick Play matchmaker, timeout prompts, rematch.
- M9: Crates/boosts, awards, session scoreboard, emotes.
- M10: Remaining Blender voxel models, biomes, lighting, particles; repeat performance checks. STOP for owner testing/approval.
- M11: Audio assets, crossfades, SFX, licensed same-voice announcer clips or owner recordings for missing lines.
- M12: Fighting-game presentation, camera-flight polish, onboarding, How to Play, settings.
- M13: Edge cases, reconnect/versioning, accessibility, adaptive-quality tuning.
- M7: AFTER M13, BEFORE M14, no later than 2026-10-26. STOP BEFORE DEPLOYING; supply exact server-first Cloudflare/Vercel-GitHub/env/Hostinger DNS instructions and wait for owner confirmation. Verify real devices and automated performance.
- M14: Metadata/OG, cover export, gamepad, result sharing.

§28 supersedes the blanket placeholder-until-M10 instruction: the M2.5 batch is built now and replaces its placeholders after approval. Run applicable tests and local play checks at each milestone, provide exact owner test steps and localhost URL once an app exists, update this file, commit, push and tag. Deploy server before frontend once hosting is established. Never add §17a non-features.

## How to run

Blender pipeline (local executable already configured in ignored .env.local): `npm run art:build -- --version`, `npm run art:build -- --self-test`, `npm run art:build -- --model chicken`, or `npm run art:build` for all voxel sources. Add `--author` when regenerating a model's voxel JSON from its edited recipe. Use `--street-logo` for the active fox logo, `--arena` for roadside props, and `--menu-props` for sign/arrows. The `--logo-variants` command rebuilds the archived A/B candidates. See art/README.md for exports and runtime copy steps; review asset PNGs directly from art/previews/.

From C:\Users\zeidk\Desktop\game_challenge:

```powershell
npm install
npm run dev
# In another terminal:
npm run dev:server
```

Open http://localhost:5173/ in a normal and an incognito window. PLAY → Create Room in one; PLAY → Join with the code in the other. A phone on the same Wi-Fi can join at http://192.168.7.7:5173/. Pick animals, host START, complete a match and Rematch. Test arrow keys/WASD, taps/swipes, shoves, two-heart respawns and sounds. SOLO remains available with one heart, pause, Retry and local best score. Keep both the Vite and local Wrangler processes running.

Open http://localhost:5173/?debug=1 for the FPS overlay. Expand the debug panel to change stations, toggle menu visibility, scroll camZ, and trigger Tile flip/Dust burst/Toast/Crowd K.O./Glove punch. In Settings switch Graphics High/Low/Auto and Reduce motion. Resize or rotate: the canvas should remain visible with smooth reframing. Next must exit left and enter right; Previous must do the reverse. Swipes follow the finger.

For a phone on the same Wi-Fi, run `npm run dev -- --host 0.0.0.0` and open `http://<PC-LAN-IP>:5173/`. If another dev server owns 5173, stop that terminal's server first. Verify the animal remains above the portrait menu, swipe the carousel, operate Settings, rotate the phone, and check for flashes/stalls. Permit private-network access if Windows prompts; no firewall settings are changed by the build. Server launch for the M2 handoff uses this LAN-capable command.

```powershell
npm run check
npm run test:e2e
```

On a new machine, first install the Playwright browser with npx playwright install chromium. npm ci is available for a clean lockfile-based dependency install. npm run build:client writes client/dist; npm run dev:server runs Wrangler on 8787 and serves that production build as well as the room API. During development use 5173 with both processes running. `npm run deploy` validates tests/build before deploying the single Worker, but the latest owner instruction defers deployment.
