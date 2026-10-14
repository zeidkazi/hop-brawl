# Hop Brawl progress

Last updated: 2026-10-14 (Asia/Calcutta).

## Status

- Completed milestones: M1 (world generation/hazards) and M2 (persistent-canvas architecture).
- Current phase: M2.5 asset-preview checkpoint — awaiting owner approval before Home changes. M1 is owner-verified; the owner rejected M2's menu appearance and added §28.
- Owner approved the plan and M1 on 2026-10-14. Deployment is deferred until after M13 and before M14, no later than 2026-10-26; no deployment without the owner's pre-deploy approval.
- Read SPEC.md including the complete new §28, which overrides earlier art/UI/fallback directions where they conflict.
- Initial commit c6ec455 (`docs: add game spec`) pushed to `origin/main` at https://github.com/zeidkazi/hop-brawl.git.
- Owner's SPEC change committed as 7b4041c (`docs(spec): defer deployment milestone`).

## M1 completed / verification

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
- `art/build_models.py` builds only exposed voxel faces, bakes actual Cycles AO at 64 samples into corner colors, combines it with palette colors, and exports one-sided, texture-free GLBs with one material. Body origin bottom-center, 12 voxels/tile, glTF +Y up / forward -Z. Eyes and fox/cat/pig tails remain separate parts with tail attachment pivots.
- Ten original models ready for owner review: logo, chicken, frog, fox, penguin, pig, cat, car, oak, crate. Each has a recipe, voxel JSON, editable .blend, GLB and transparent three-quarter PNG in art/previews/. Logo/crate lettering was visually checked and corrected to read from the front.
- All ten model exports total 1,312,112 bytes (1.31 MB), below the 3 MB library budget. Sources and previews are not runtime downloads. Each file is logged in CREDITS.md with its original recipe URL; generated asset files are CC0 under art/LICENSE.md.
- Blender self-test passes (interior-face removal and finite baked color output). npm run check passes: 56 tests in 13 files, typecheck and production build. New tests validate GLB headers, Blender provenance, vertex colors/normals, no textures or Draco, one-sided materials, AO metadata, dimensions, animation parts, .blend presence and RGBA previews. All six existing desktop/mobile browser regression checks pass at this checkpoint.
- Home and runtime font/quality/layout remain the M2 version pending asset approval, as requested. Lilita One replacement, no menu dynamic resolution, DPR 1.25/odd-size edge fixes, biome sky/scenery fill, in-world logo/select/sign/arrows and the §28.4 layout are the second half of M2.5. No M3 work started; m2.5-art-direction tag is reserved until the corrected Home is approved.

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

- M2's visual direction is rejected and must be replaced under §28 after the current model-preview approval. The unchanged Home still has Pixelify Sans, boxed menus and menu dynamic resolution; these are explicitly pending M2.5 fixes, not accepted final visuals. Solo remains disabled until M3.
- Worker/Room implementation and wrangler dev arrive in M4. Do not add fake server endpoints just to make an unavailable server command appear to work.
- Full two-player transition traces, 60-second 4× CPU-throttled gameplay, GC-pause analysis and real-device performance remain for the gameplay/network milestones and pre-deployment validation. Current FPS numbers cover only the placeholder diorama on the host GPU.
- Cloudflare and Vercel authentication and free-account plan verification remain required before deployment.
- Real Android/iPhone checks remain owner-assisted at the relevant milestones.

## Next exact step

WAIT for owner feedback on the ten art/previews/*.png assets. If revisions are requested, change only the named model recipe/source, rebuild it with Blender, validate and show its new preview. After asset approval, implement §28.2–28.4 (Lilita One, full menu resolution, precise canvas sizing/sky/scenery, in-world logo/animal select, minimal bottom actions and icon buttons). Preserve persistent-canvas/pooling architecture. Then show Home screenshots at 390×844 and 1440×900 and WAIT for approval before M3. Do not tag M2.5 complete at the asset-preview checkpoint.

## Milestone plan / gates

- M1: Shared config, PRNG, worldgen, hazards, unit/fuzz tests. COMPLETE.
- M2: Persistent canvas/scene, camera stations, GSAP UI motion, pools, quality tiers, debug overlay. COMPLETE; tag m2-architecture.
- M2.5: Blender-only pipeline and art/UI direction correction. STOP for asset-preview approval, then STOP for Home screenshot approval. Tag m2.5-art-direction only when complete.
- M3: Responsive controls, hopping, hazards/death, camera, Solo and tile-flip retry. STOP for owner testing/approval.
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

Blender pipeline (local executable already configured in ignored .env.local): `npm run art:build -- --version`, `npm run art:build -- --self-test`, `npm run art:build -- --model chicken`, or `npm run art:build` for all voxel sources. Add `--author` when regenerating a model's voxel JSON from its edited recipe. See art/README.md. Review PNGs directly from art/previews/; the current game does not load these models yet.

From C:\Users\zeidk\Desktop\game_challenge:

```powershell
npm install
npm run dev
```

Open http://localhost:5173/ in a normal and an incognito window. Loading should progress into the live Home diorama. Enter a name, change animals using arrows/swipe, open Friends/Settings/How to Play/Credits, and return using Back/Esc. The world must stay visible and animated throughout. Reload to check saved preferences; incognito should keep its own session. Try http://localhost:5173/?room=ABCD for prefilled code boxes. Gameplay/multiplayer buttons are intentionally disabled at M2.

Open http://localhost:5173/?debug=1 for the FPS overlay. Expand the debug panel to change stations, toggle menu visibility, scroll camZ, and trigger Tile flip/Dust burst/Toast. In Settings switch Graphics High/Low/Auto and Reduce motion. Resize or rotate: the canvas should remain visible with smooth reframing.

For a phone on the same Wi-Fi, run `npm run dev -- --host 0.0.0.0` and open `http://<PC-LAN-IP>:5173/`. If another dev server owns 5173, stop that terminal's server first. Verify the animal remains above the portrait menu, swipe the carousel, operate Settings, rotate the phone, and check for flashes/stalls. Permit private-network access if Windows prompts; no firewall settings are changed by the build. Server launch for the M2 handoff uses this LAN-capable command.

```powershell
npm run check
npm run test:e2e
```

On a new machine, first install the Playwright browser with npx playwright install chromium. npm ci is available for a clean lockfile-based dependency install. npm run build:client writes client/dist; npm run preview serves that build. M4 adds npm run dev:server / wrangler dev on port 8787. All work remains local until M7.
