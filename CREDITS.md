# Hop Brawl asset credits

M2 includes the spec-required self-hosted fonts and original colored-box geometry. Runtime/development packages retain their respective upstream licenses; this ledger tracks assets shipped with the game.

Every imported asset must have an individual file path, source URL and verified license recorded here before it is committed. Only CC0 or licenses requiring no attribution are permitted by the owner. Project-generated model and audio files will also be logged with their provenance when created.

## Shipped assets

| File / source module | Source URL / provenance | License |
|---|---|---|
| `art/fonts/LilitaOne-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/LilitaOne-Regular.ttf | SIL OFL 1.1; no in-game attribution required; redistribution notice in `art/fonts/OFL.txt` from https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/OFL.txt |
| `@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/pixelify-sans@5.3.0/files/pixelify-sans-latin-700-normal.woff2 ; authors: https://github.com/eifetx/Pixelify-Sans | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/pixelify-sans.txt` |
| `@fontsource/nunito/files/nunito-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-700-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/nunito.txt` |
| `@fontsource/nunito/files/nunito-latin-800-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-800-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1; same included notice |
| `client/src/game/world-view.ts`, `client/src/game/particles.ts` | Original procedural colored boxes, ground and circle shadows created for Hop Brawl; no imported art | Original project geometry, no third-party attribution |

Font license text verified from the pinned packages. Fonts are bundled locally; no external font requests. §28 replaces Pixelify Sans with Lilita One in the Home revision after model approval; the current runtime still uses the M2 fonts at this asset-only checkpoint.

## M2.5 Blender assets — partial owner approval

All assets below are original project creations, authored as voxel data and built in Blender 5.2.2 LTS. No downloaded art, font outlines or other game assets were used. Each row lists the editable source, game export and transparent rendered preview. License for every file: **CC0 1.0 Universal**, no attribution required; see `art/LICENSE.md` and https://creativecommons.org/publicdomain/zero/1.0/legalcode .

| Files | Source URL / original recipe |
|---|---|
| `art/voxels/logo.json`, `art/logo.blend`, `client/public/models/logo.glb`, `art/previews/logo.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/logo.py |
| `art/voxels/chicken.json`, `art/chicken.blend`, `client/public/models/chicken.glb`, `art/previews/chicken.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/chicken.py |
| `art/voxels/frog.json`, `art/frog.blend`, `client/public/models/frog.glb`, `art/previews/frog.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/frog.py |
| `art/voxels/fox.json`, `art/fox.blend`, `client/public/models/fox.glb`, `art/previews/fox.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/fox.py |
| `art/voxels/penguin.json`, `art/penguin.blend`, `client/public/models/penguin.glb`, `art/previews/penguin.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/penguin.py |
| `art/voxels/pig.json`, `art/pig.blend`, `client/public/models/pig.glb`, `art/previews/pig.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/pig.py |
| `art/voxels/cat.json`, `art/cat.blend`, `client/public/models/cat.glb`, `art/previews/cat.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/cat.py |
| `art/voxels/car.json`, `art/car.blend`, `client/public/models/car.glb`, `art/previews/car.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/car.py |
| `art/voxels/oak.json`, `art/oak.blend`, `client/public/models/oak.glb`, `art/previews/oak.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/oak.py |
| `art/voxels/crate.json`, `art/crate.blend`, `client/public/models/crate.glb`, `art/previews/crate.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/crate.py |
| `art/voxels/hatchback.json`, `art/hatchback.blend`, `client/public/models/hatchback.glb`, `art/previews/hatchback.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/hatchback.py |
| `art/voxels/taxi.json`, `art/taxi.blend`, `client/public/models/taxi.glb`, `art/previews/taxi.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/taxi.py |
| `art/voxels/truck.json`, `art/truck.blend`, `client/public/models/truck.glb`, `art/previews/truck.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/truck.py |
| `art/voxels/train_engine.json`, `art/train_engine.blend`, `client/public/models/train_engine.glb`, `art/previews/train_engine.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/train_engine.py |
| `art/voxels/train_carriage.json`, `art/train_carriage.blend`, `client/public/models/train_carriage.glb`, `art/previews/train_carriage.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/train_carriage.py |
| `art/voxels/log.json`, `art/log.blend`, `client/public/models/log.glb`, `art/previews/log.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/log.py |
| `art/previews/logo-intro.png` (four original Blender renders) | https://github.com/zeidkazi/hop-brawl/blob/main/art/logo_poses.py ; models from https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/logo.py |

The owner approved all six animals, oak and crate. The lowered sedan, six new vehicle/log models, composed logo and intro pose strip await approval. The logo reuses the approved original chicken geometry with a forward viewing pitch. The runtime imports these only after the M2.5 preview approval gate. Remaining props arrive in M10 using the same mandatory Blender pipeline.

The following silhouette previews are original Blender renders of the same animal geometry, with black material on white. Each is also **CC0 1.0 Universal**, with the same license above.

| File | Source URL / original recipe |
|---|---|
| `art/previews/chicken-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/chicken.py |
| `art/previews/penguin-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/penguin.py |
| `art/previews/frog-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/frog.py |
| `art/previews/fox-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/fox.py |
| `art/previews/pig-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/pig.py |
| `art/previews/cat-silhouette.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/recipes/cat.py |

## Announcer acquisition (milestone 11)

Find one consistent, energetic voice for: "Round one", "Round two", "Final round", "Showdown", "Hop!", "K.O.!", "Winner!". Search free voice packs, including Kenney and CC0-filtered OpenGameArt/Freesound sources. Verify each file's license; free download alone is not license permission. Record missing same-voice lines and ask the owner to record them at M11. Until then use text slams and SFX. No announcer files have been selected or downloaded yet.
