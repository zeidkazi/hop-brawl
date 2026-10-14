# Hop Brawl

Cross the road. Shove your friends.

A real-time multiplayer voxel road-crossing brawler, built to [SPEC.md](SPEC.md).

**Status:** Solo and Private Rooms for 2–4 players are playable locally. Sections 31–32 bring the angled camera, full draw distance, log aim assist, multiplayer and minimum sounds into the submission build. Deployment is deferred by the owner's latest instruction; no public URL or submission tag exists yet.

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

PLAY opens Create/Join. Create a room, copy its link or share the four-letter code, then join from another window or phone. Choose a free animal in the lobby; the host starts when at least two players have joined. Each player has two hearts, a 1.5-second respawn and two seconds of protection. Hop into an adjacent player to shove them; win two rounds to win. Rematch and Back to lobby are host controls. Leaving a match makes that player out; the last connected participant wins by forfeit. Quick Play, crates and boosts are deferred.

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

Solo and two-to-four-player Private Rooms. TypeScript, Vite, Three.js, GSAP, Web Audio synthesis, Vitest and Playwright; Cloudflare Workers with hibernating SQLite Durable Objects. All sound synthesis is original and credited in CREDITS.md. Quick Play and the rest of section 32.2 remain deferred.

## Deployment

Deployment is prepared but has not been performed. The owner deferred it after section 32. A single Worker serves client/dist through Workers static assets, with SPA fallback and /api/* and /ws/* routed to the Worker. wrangler.toml declares the SQLite Room migration and binding, compatible with Workers Free. No Vercel, DNS change, paid service or card is needed for this setup.

When the owner is ready:

```powershell
npx wrangler login
npm run deploy
```

The deploy script runs unit tests, both typechecks and the production build before Wrangler. To validate packaging without publishing: `npm run check` then `npx wrangler deploy --dry-run`. The expected public address is https://hop-brawl.<account-subdomain>.workers.dev. Verify a full match/rematch there before tagging that deployed commit v0.9-submission.

No environment variable is required for the single-origin build. VITE_SERVER_URL remains available for a later split frontend/server; set it to the server's HTTPS origin before building. If splitting origins later, set the Worker's ALLOWED_ORIGINS to the exact frontend origins separated by commas. Same-origin API and WebSocket requests are allowed by default; foreign origins are rejected. Never commit .env, .dev.vars, login credentials or .wrangler state.

See [PROGRESS.md](PROGRESS.md) for the next exact step and [DECISIONS.md](DECISIONS.md) for owner clarifications. All asset sources and licenses go in [CREDITS.md](CREDITS.md).

Built with ChatGPT Work (OpenAI) for the Handshake AI Skills Studio Multiplayer Game Challenge.
