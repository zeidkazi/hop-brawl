# Hop Brawl

Cross the road. Shove your friends.

A real-time multiplayer voxel road-crossing brawler, built to [SPEC.md](SPEC.md).

**Status:** milestone 1 complete. The shared generator and hazard simulation are tested. The local frontend currently shows only Loading…; the persistent scene arrives in M2 and playable Solo in M3. No public deployment or cover image exists yet.

## Local development

Use Node.js 24 LTS and npm. From the project root:

```powershell
npm install
npm run dev
```

Open http://localhost:5173/. For a clean install from the committed lockfile, use npm ci. The local Cloudflare server and npm run dev:server / wrangler dev command will be added in M4.

## Tests and build

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

- Unit tests cover deterministic randomness, all four row types, hazards, Slow-Mo and collision boundaries.
- The generator fuzz test checks 1,000 random seeds × 300 rows against every §10 solvability guarantee.
- M1 browser tests compare shared world/hazard results with Node in two separate contexts at desktop and phone viewport sizes. Full gameplay, latency and performance tests arrive with their corresponding features.
- npm run build:client creates client/dist; npm run preview serves the production build locally.

## How to play (target gameplay)

Hop with arrow keys/WASD or phone taps/swipes. Dodge traffic and trains, ride logs, and stay ahead of the scrolling screen. Hop into another player to shove them. Versus gives each player two hearts; win two rounds to win the match. Solo is an endless one-heart run. Animals are cosmetic.

## Planned modes and stack

Solo, two-player Quick Play and two-to-four-player Private Rooms. TypeScript, Vite, Three.js, GSAP, Howler, Zod, Vitest and Playwright; Cloudflare Workers with hibernating Durable Objects for multiplayer. Only the M1 development/test dependencies are installed so far.

## Deployment

Development stays local until M7, which now follows M13 and precedes M14, no later than 2026-10-26. Owner approval is required before deploying. Hosting remains Cloudflare Workers Free plus Vercel Hobby, without a credit card. Deploy the server first; then the GitHub-connected Vercel frontend with VITE_SERVER_URL set to the Worker origin. Add only the Vercel-provided Hostinger subdomain CNAME; do not change nameservers. Exact configuration and commands will be prepared at M7 under SPEC §15a, §25 and §26.

See [PROGRESS.md](PROGRESS.md) for the next exact step and [DECISIONS.md](DECISIONS.md) for owner clarifications. All asset sources and licenses go in [CREDITS.md](CREDITS.md).

Built with ChatGPT Work (OpenAI) for the Handshake AI Skills Studio Multiplayer Game Challenge.
