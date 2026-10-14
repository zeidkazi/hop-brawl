# Hop Brawl

Cross the road. Shove your friends.

A real-time multiplayer voxel road-crossing brawler, built to [SPEC.md](SPEC.md).

**Status:** M2.5 models/Home/Loading are complete and tagged. M3 Solo is playable locally and awaiting owner playtesting before M4. See the [Solo screens and measurements](art/review/SOLO.md), [model checklist](art/review/SIGNOFF.md), and [loading transition/error evidence](art/review/LOADING.md). No public deployment exists yet.

## Local development

Use Node.js 24 LTS and npm. From the project root:

```powershell
npm install
npm run dev
```

Open http://localhost:5173/. For a clean install from the committed lockfile, use npm ci. The local Cloudflare server and npm run dev:server / wrangler dev command will be added in M4.

Tap the name pill to edit; tap the animal for a boxing combo or use arrows/swipe to change it. Choose SOLO, enter a name if needed, and wait for HOP! Arrow keys/WASD move one tile; click/tap hops forward, and a phone swipe hops in its direction. Esc or the gear pauses; Resume counts down, Restart creates a fresh run, and Retry/Space/Enter starts again after Game Over. Best score saves locally. Multiplayer buttons remain disabled until their networking milestones. Add `?debug=1` for FPS/draw/pool metrics. For phone testing on the same Wi-Fi, start with `npm run dev -- --host 0.0.0.0` and open the PC's LAN address on port 5173.

## Tests and build

Blender 5.2.2 LTS is verified locally. Set `BLENDER_PATH` in the environment or gitignored `.env.local`, then run `npm run art:build` for all models or `npm run art:build -- --model chicken` for one. Blender is mandatory; no Node fallback. See [art/README.md](art/README.md) for source, bake, export and preview details.

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

- Unit tests cover deterministic randomness, all four row types, hazards, Slow-Mo, buffered hops, log carry/exit boundaries, input gestures, and saved Solo best.
- The generator fuzz test checks 1,000 random seeds × 300 rows against every §10 solvability guarantee.
- Browser tests compare shared world/hazard results with Node in independent contexts and check persistent-canvas navigation, resize, graphics switches, resource bounds, denied storage, loading/error recovery, Solo pause/death/retry, all six animal selections, and exact odd-window coverage at DPR 1/1.25/1.5/2. Windows tests use D3D11 hardware acceleration. Multiplayer, latency, 4× CPU and physical-device performance validation remain scheduled for their milestones.
- npm run build:client creates client/dist; npm run preview serves the production build locally.

## How to play (target gameplay)

Hop with arrow keys/WASD or phone taps/swipes. Dodge traffic and trains, ride logs, and stay ahead of the scrolling screen. Hop into another player to shove them. Versus gives each player two hearts; win two rounds to win the match. Solo is an endless one-heart run. Animals are cosmetic.

## Planned modes and stack

Solo, two-player Quick Play and two-to-four-player Private Rooms. TypeScript, Vite, Three.js, GSAP, Howler, Zod, Vitest and Playwright; Cloudflare Workers with hibernating Durable Objects for multiplayer. Rendering, animation, fonts and test libraries are installed; networking/audio packages arrive with their respective milestones.

## Deployment

Development stays local until M7, which now follows M13 and precedes M14, no later than 2026-10-26. Owner approval is required before deploying. Hosting remains Cloudflare Workers Free plus Vercel Hobby, without a credit card. Deploy the server first; then the GitHub-connected Vercel frontend with VITE_SERVER_URL set to the Worker origin. Add only the Vercel-provided Hostinger subdomain CNAME; do not change nameservers. Exact configuration and commands will be prepared at M7 under SPEC §15a, §25 and §26.

See [PROGRESS.md](PROGRESS.md) for the next exact step and [DECISIONS.md](DECISIONS.md) for owner clarifications. All asset sources and licenses go in [CREDITS.md](CREDITS.md).

Built with ChatGPT Work (OpenAI) for the Handshake AI Skills Studio Multiplayer Game Challenge.
