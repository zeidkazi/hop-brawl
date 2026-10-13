# Hop Brawl progress

Last updated: 2026-10-14 (Asia/Calcutta).

## Status

- Completed milestones: none.
- Current phase: setup preflight complete, awaiting owner's build-plan approval.
- No gameplay code, package manifest, dependencies, or build scripts have been added to the project.
- Read the complete SPEC.md (all 27 sections); reread the owner's updated cap and spectator rules and recorded them in DECISIONS.md.
- Initial commit c6ec455 (`docs: add game spec`) pushed to `origin/main` at https://github.com/zeidkazi/hop-brawl.git.

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
- Browser automation: Codex in-app browser available. Playwright E2E remains required; install its project dependency and browsers after build approval. Do not claim its E2E/performance tests have run during preflight.
- No Blender/MCP found: use §25 Node model pipeline at M10.
- No usable TTS: speech skill installed but OPENAI_API_KEY is not configured; use §25 CC0 voice pack or text + SFX fallback at M11.
- Installed official skills via Skill Installer: playwright, playwright-interactive, screenshot, cloudflare-deploy, vercel-deploy, speech, security-best-practices. They become available on the next turn; read applicable instructions before using them.
- Restricted-shell network/localhost operations and Git index writes required approved elevated execution and then succeeded.

## Known bugs / unresolved checks

- No game exists yet, so gameplay/build/test results are not available.
- Cloudflare and Vercel authentication and free-account plan verification remain required before deployment.
- Real Android/iPhone checks remain owner-assisted at the relevant milestones.

## Next exact step

Wait for the owner's explicit build-plan approval. Then reread SPEC.md, this file, and DECISIONS.md; begin milestone 1 by pinning current stable package versions, adding the minimal TypeScript/build/Vitest setup, and implementing shared/config.ts, PRNG, deterministic world generation and hazards with unit and 1,000-seed × 300-row fuzz tests. Use small passing commits with the exact Built-with trailer. Do not begin implementation before approval.

## Milestone plan / gates

1. Shared config, PRNG, worldgen, hazards, unit/fuzz tests.
2. Persistent canvas/scene, camera stations, GSAP UI motion, pools, quality tiers, debug overlay.
3. Responsive controls, hopping, hazards/death, camera, Solo and tile-flip retry. STOP for owner testing/approval.
4. Worker + hibernating Room DO, create/join, lobby, clock sync.
5. Authoritative movement, prediction, interpolation, shared camera.
6. Hearts, respawn, shove, rounds/matches, results.
7. Server-first Cloudflare deployment, Vercel-GitHub connection and custom domain, real-device and automated performance verification. STOP with exact deploy/env/DNS instructions for owner confirmation.
8. Hibernating Quick Play matchmaker, timeout prompts, rematch.
9. Crates/boosts, awards, session scoreboard, emotes.
10. Node-built voxel models, biomes, lighting, particles; repeat performance checks. STOP for owner testing/approval.
11. Audio assets, crossfades, SFX, announcer fallback.
12. Fighting-game presentation, camera-flight polish, onboarding, How to Play, settings.
13. Edge cases, reconnect/versioning, accessibility, adaptive-quality tuning.
14. Metadata/OG, cover export, gamepad, result sharing.

Use colored boxes until M10. Run applicable tests and local play checks at each milestone, provide exact owner test steps and localhost URL once an app exists, update this file, commit, push and tag. Deploy server before frontend once hosting is established. Never add §17a non-features.

## How to run

No game server is currently running. There is no package.json yet, so npm install/build/test/dev are not project commands until milestone 1 setup is approved and created. The specified future local commands are npm install, npm run dev (port 5173), and npm run dev:server (port 8787).
