# Hop Brawl asset credits

M2 includes the spec-required self-hosted fonts and original colored-box geometry. Runtime/development packages retain their respective upstream licenses; this ledger tracks assets shipped with the game.

Every imported asset must have an individual file path, source URL and verified license recorded here before it is committed. Only CC0 or licenses requiring no attribution are permitted by the owner. Project-generated model and audio files will also be logged with their provenance when created.

## Shipped assets

| File / source module | Source URL / provenance | License |
|---|---|---|
| `@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/pixelify-sans@5.3.0/files/pixelify-sans-latin-700-normal.woff2 ; authors: https://github.com/eifetx/Pixelify-Sans | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/pixelify-sans.txt` |
| `@fontsource/nunito/files/nunito-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-700-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/nunito.txt` |
| `@fontsource/nunito/files/nunito-latin-800-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-800-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1; same included notice |
| `client/src/game/world-view.ts`, `client/src/game/particles.ts` | Original procedural colored boxes, ground and circle shadows created for Hop Brawl; no imported art | Original project geometry, no third-party attribution |

Font license text verified from the pinned packages. Fonts are bundled locally; no external font requests. Detailed animal/prop models remain deferred to M10.

## Announcer acquisition (milestone 11)

Find one consistent, energetic voice for: "Round one", "Round two", "Final round", "Showdown", "Hop!", "K.O.!", "Winner!". Search free voice packs, including Kenney and CC0-filtered OpenGameArt/Freesound sources. Verify each file's license; free download alone is not license permission. Record missing same-voice lines and ask the owner to record them at M11. Until then use text slams and SFX. No announcer files have been selected or downloaded yet.
