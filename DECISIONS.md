# Hop Brawl decisions

- 2026-10-14, owner clarification, SPEC §4.7: At the 4:00 cap, rank by highest distance, then most hearts remaining, then earliest server time reaching that distance; draw and replay only if all three tie. The separate simultaneous-knockout rule remains as specified.
- 2026-10-14, owner clarification, SPEC §6.1: At Match End, admit waiting spectators as players in join order up to four players for both Rematch and Back to Lobby; remaining spectators see "Room full — you'll join when a spot opens". This overrides §7's older "same players" wording for Rematch.
- 2026-10-14, owner clarification, SPEC §6.1: Quick Play rooms remain 1v1 and reject code joins with ROOM_NOT_FOUND; the matchmaker-assigned pair must be authenticated when connecting to their assigned room.
- 2026-10-14, SPEC §25: Use the default Node voxel-to-GLB pipeline with classic four-level per-vertex AO at milestone 10; Blender is not installed or connected.
- 2026-10-14, SPEC §25: No usable text-to-speech credentials are configured. At milestone 11, use correctly licensed CC0 announcer clips if available, otherwise text slams with a punchy SFX hit; do not introduce a paid dependency.
- 2026-10-14, SPEC §27: Cloudflare and Vercel authentication are deferred to milestone 7. Do not use temporary deployment accounts or change hosting plans.
- 2026-10-14, SPEC §26–27: Preflight commits contain only documentation and Git setup. Build/test commands are not applicable before the approved milestone 1 scaffold exists; validate staged whitespace and file scope now, and require builds/tests on subsequent implementation commits.
