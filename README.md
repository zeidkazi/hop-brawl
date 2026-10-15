# Hop Brawl

Cross the road. Shove your friends.

A real-time multiplayer voxel road-crossing brawler, built to [SPEC.md](SPEC.md).

**Status:** Solo, Private Rooms for 2–4 players, and 1v1 Quick Match are deployed at https://hop-brawl.hop-brawl.workers.dev from `batch-b2-stable`. Live verification is recorded in [PROGRESS.md](PROGRESS.md). Batch C remains gated on owner approval.

## Local development

Use Node.js 24 LTS and npm. From the project root:

```powershell
npm install
npm run dev
# Keep a second terminal running:
npm run dev:server
```

Open http://localhost:5173/. Vite forwards /api and /ws to the local Worker at http://127.0.0.1:8787. `npm run dev:server` is `wrangler dev --local` and needs no login. For a clean install from the committed lockfile, use npm ci. To test the production frontend and room server together, run npm run build first and open http://127.0.0.1:8787.

On Windows, restart `npm run dev:server` after a production rebuild. Vite replaces client/dist, which can invalidate Wrangler's static-asset watcher. Ordinary source edits at the Vite URL do not require a production rebuild.

MULTIPLAYER opens Quick Match and Create/Join. Create a room, copy its link or share the four-letter code, then join from another window or phone. Choose a free animal in the lobby; the host starts when at least two players have joined. Each player has two hearts, a 1.5-second respawn and two seconds of protection. Hop into an adjacent player to shove them; win two rounds to win. Rematch and Back to lobby are host controls. Leaving a match makes that player out; the last connected participant wins by forfeit. Quick Match pairs two live players automatically; both must request a rematch within twenty seconds. Crates and boosts remain deferred.

Tap the name pill to edit; tap the animal for a boxing combo or use arrows/swipe to change it. Arrow keys/WASD move one tile; click/tap hops forward and swipes move in their direction. Solo has one heart, saved best score, pause and Retry. Multiplayer continues when a tab is hidden and resyncs on return. Add `?debug=1` for FPS/draw/pool metrics. For a phone on the same Wi-Fi, open the PC's LAN address on port 5173; Vite already binds to the LAN. Keep both terminals running.

## Tests and build

Blender 5.2.2 LTS is verified locally. Set `BLENDER_PATH` in the environment or gitignored `.env.local`, then run `npm run art:build` for all models or `npm run art:build -- --model chicken` for one. Blender is mandatory; no Node fallback. See [art/README.md](art/README.md) for source, bake, export and preview details.

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

- Unit tests cover deterministic randomness, all four row types, hazards, Slow-Mo, buffered hops, log carry/exit boundaries, input gestures, and saved Solo best.
- The generator fuzz test checks 1,000 random seeds × 300 rows against every §10 solvability guarantee.
- Browser tests cover shared world parity, persistent canvas/navigation, loading, Solo, camera coverage, room capacity, invite-name flow, a full three-round match, rematch, shove and host handoff. Windows tests use D3D11 hardware acceleration. `npx playwright test tests/e2e/multiplayer.spec.ts --project=desktop` tests desktop plus a separate phone-sized browser. Set HOP_TEST_URL to test the production Worker on 8787. Physical-phone testing is separate. Review screenshot export is off by default; HOP_CAPTURE_REVIEW enables historical screenshot calls only when requested.
- npm run build:client creates client/dist; npm run preview serves the production build locally.

## How to play (target gameplay)

Hop with arrow keys/WASD or phone taps/swipes. Dodge traffic and trains, ride logs, and stay ahead of the scrolling screen. Hop into another player to shove them. Versus gives each player two hearts; win two rounds to win the match. Solo is an endless one-heart run. Animals are cosmetic.

## Modes and stack

Solo, two-to-four-player Private Rooms and 1v1 Quick Match. TypeScript, Vite, Three.js, GSAP, Howler, Vitest and Playwright; Cloudflare Workers with hibernating SQLite Room and global Matchmaker Durable Objects. Audio sources and licenses are listed in CREDITS.md.

## Deployment

The single Worker serves client/dist through Workers static assets, with SPA fallback and /api/* and /ws/* routed to the Worker. The tested `batch-b2-stable` release is deployed at https://hop-brawl.hop-brawl.workers.dev. The SQLite Room and Matchmaker bindings use Workers Free; no Vercel or credit card is required.

**Custom domain prepared, not deployed:** https://hopbrawl.zeidkazi.in. The `custom_domain = true` route and exact allowed origin are in wrangler.toml. Do not run a live deployment from the current configuration until the owner explicitly confirms that zeidkazi.in is Active. The Worker name stays `hop-brawl`; workers.dev remains enabled. No custom-domain DNS or certificate changes have been made by this preparation.

After that confirmation, authenticate if needed and deploy:

```powershell
npx wrangler whoami
npm run deploy
```

The deploy script runs unit tests, both typechecks and the production build before Wrangler. Packaging can be checked without publishing or activating the pending route: `npm run check` then `npx wrangler deploy --dry-run`.

Room share links are generated from the current page URL, preserving its own origin and replacing the query with `?room=CODE`; they never hard-code either production hostname. API and WebSocket connections also use the page origin unless VITE_SERVER_URL is explicitly set for split hosting. Leave it unset for this single-Worker deployment. ALLOWED_ORIGINS includes https://hopbrawl.zeidkazi.in; same-origin requests are always accepted and unrelated foreign origins are rejected. Never commit .env, .dev.vars, login credentials or .wrangler state.

See [PROGRESS.md](PROGRESS.md) for the next exact step and [DECISIONS.md](DECISIONS.md) for owner clarifications. All asset sources and licenses go in [CREDITS.md](CREDITS.md).

Built with ChatGPT Work (OpenAI) for the Handshake AI Skills Studio Multiplayer Game Challenge.
