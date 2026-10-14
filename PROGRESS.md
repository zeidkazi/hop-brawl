# Hop Brawl progress

Last updated: 2026-10-14 (Asia/Calcutta).

## Status

- Completed milestones: M1 (shared config, PRNG, world generation, hazards, unit/fuzz tests).
- Current phase: M1 complete; next is M2 persistent-canvas architecture.
- Owner approved the plan and M1 on 2026-10-14. Deployment is deferred until after M13 and before M14, no later than 2026-10-26; no deployment without the owner's pre-deploy approval.
- Read the complete SPEC.md (all 27 sections); reread the owner's updated cap and spectator rules and recorded them in DECISIONS.md.
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

## Setup preflight (§27)

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
- No Blender/MCP found: use §25 Node model pipeline at M10.
- No usable TTS: at M11 search for one consistent energetic voice with all seven owner-requested lines, licensed CC0 or no-attribution-required; log every file URL/license in CREDITS.md. Report missing same-voice lines so the owner can record them. Use text + SFX until then.
- Installed official skills: playwright, playwright-interactive, screenshot, cloudflare-deploy, vercel-deploy, speech, security-best-practices. Playwright skill used for M1; read applicable instructions before using the others.
- Restricted-shell network/localhost operations and Git index writes required approved elevated execution and then succeeded.

## Known bugs / unresolved checks

- No known M1 failures. M2 rendering and M3 gameplay are not implemented; Loading… stays on screen by design at this milestone.
- Worker/Room implementation and wrangler dev arrive in M4. Do not add fake server endpoints just to make an unavailable server command appear to work.
- No FPS, mobile hardware performance or multiplayer claim is supported by M1's browser parity checks.
- Cloudflare and Vercel authentication and free-account plan verification remain required before deployment.
- Real Android/iPhone checks remain owner-assisted at the relevant milestones.

## Next exact step

Reread SPEC.md, this file, and DECISIONS.md. Begin M2 by pinning the specified rendering/animation/debug/font libraries and building the persistent WebGL canvas and single scene in client/src/game. Add camera stations, GSAP UI motion, pooled rows/objects and High/Medium/Low quality tiers from the start. Consume shared world descriptors generated outside the render loop. Replace the M1-only Loading… assertion in tests/e2e/shared.spec.ts as the real loading/Home flow arrives, while preserving browser/Node parity coverage. No new approval is needed before M2; the next required owner checkpoint is after M3.

## Milestone plan / gates

- M1: Shared config, PRNG, worldgen, hazards, unit/fuzz tests. COMPLETE.
- M2: Persistent canvas/scene, camera stations, GSAP UI motion, pools, quality tiers, debug overlay.
- M3: Responsive controls, hopping, hazards/death, camera, Solo and tile-flip retry. STOP for owner testing/approval.
- M4: Worker + hibernating Room DO, create/join, lobby, clock sync.
- M5: Authoritative movement, prediction, interpolation, shared camera.
- M6: Hearts, respawn, shove, rounds/matches, results.
- M8: Hibernating Quick Play matchmaker, timeout prompts, rematch.
- M9: Crates/boosts, awards, session scoreboard, emotes.
- M10: Node-built voxel models, biomes, lighting, particles; repeat performance checks. STOP for owner testing/approval.
- M11: Audio assets, crossfades, SFX, licensed same-voice announcer clips or owner recordings for missing lines.
- M12: Fighting-game presentation, camera-flight polish, onboarding, How to Play, settings.
- M13: Edge cases, reconnect/versioning, accessibility, adaptive-quality tuning.
- M7: AFTER M13, BEFORE M14, no later than 2026-10-26. STOP BEFORE DEPLOYING; supply exact server-first Cloudflare/Vercel-GitHub/env/Hostinger DNS instructions and wait for owner confirmation. Verify real devices and automated performance.
- M14: Metadata/OG, cover export, gamepad, result sharing.

Use colored boxes until M10. Run applicable tests and local play checks at each milestone, provide exact owner test steps and localhost URL once an app exists, update this file, commit, push and tag. Deploy server before frontend once hosting is established. Never add §17a non-features.

## How to run

From C:\Users\zeidk\Desktop\game_challenge:

```powershell
npm install
npm run dev
```

Open http://localhost:5173/ in a normal and an incognito window. Both should show Loading… and the correct browser title without console errors. There are no controls to test at M1; Solo begins at M3. Real-phone gameplay checks begin once rendering/input exist.

```powershell
npm run check
npm run test:e2e
```

On a new machine, first install the Playwright browser with npx playwright install chromium. npm ci is available for a clean lockfile-based dependency install. npm run build:client writes client/dist; npm run preview serves that build. M4 adds npm run dev:server / wrangler dev on port 8787. All work remains local until M7.
