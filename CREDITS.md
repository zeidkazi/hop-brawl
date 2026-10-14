# Hop Brawl asset credits

M2.5 includes self-hosted Lilita One/Nunito fonts, approved Blender assets and original procedural scenery. Runtime/development packages retain their respective upstream licenses; this ledger tracks assets shipped with the game.

Every imported asset must have an individual file path, source URL and verified license recorded here before it is committed. Only CC0 or licenses requiring no attribution are permitted by the owner. Project-generated model and audio files will also be logged with their provenance when created.

## Shipped assets

| File / source module | Source URL / provenance | License |
|---|---|---|
| `art/fonts/LilitaOne-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/LilitaOne-Regular.ttf | SIL OFL 1.1; no in-game attribution required; redistribution notice in `art/fonts/OFL.txt` from https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/OFL.txt |
| `@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/lilita-one@5.3.0/files/lilita-one-latin-400-normal.woff2 | SIL OFL 1.1, no in-game attribution required; redistribution notice retained in `client/public/licenses/lilita-one.txt` |
| `@fontsource/nunito/files/nunito-latin-700-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-700-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1, no in-game attribution required; required redistribution notice retained in `client/public/licenses/nunito.txt` |
| `@fontsource/nunito/files/nunito-latin-800-normal.woff2` (5.3.0) | https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.3.0/files/nunito-latin-800-normal.woff2 ; authors: https://github.com/googlefonts/nunito | SIL OFL 1.1; same included notice |
| `client/src/game/world-view.ts`, `client/src/game/home-scene.ts`, `client/src/game/sky.ts`, `client/src/game/particles.ts` | Original procedural colored boxes, ground and circle shadows created for Hop Brawl; no imported art | Original project geometry, no third-party attribution |

Font license text verified from the pinned packages. Lilita One and Nunito are bundled locally; no external font requests. Pixelify Sans is retired under §28.

## M2.5 Blender assets — logo A selected; Home review pending

The animals, vehicles and props below are original voxel creations built in Blender 5.2.2 LTS. The two logo candidates use the licensed Lilita One font listed above, converted from Blender Text objects; they are rendered artwork, not redistributed font software. Original artwork and arrangements: **CC0 1.0 Universal**, no attribution required; see `art/LICENSE.md` and https://creativecommons.org/publicdomain/zero/1.0/legalcode . The font itself retains OFL 1.1. Preview files are transparent except the logo review on the owner-requested sky-blue background.

| Files | Source URL / original recipe |
|---|---|
| `art/home_controls.blend`, `client/public/models/home_controls.glb`, `art/previews/home_controls.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_menu.py ; original CC0 wooden sign and voxel arrows, Lilita One outline labels using the font and OFL notice above |
| `client/public/models/logo.glb` | Owner-selected A; identical to `art/variants/logo_smooth.glb`, built from https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py using Lilita One (OFL notice above) |
| `art/logo_smooth.blend`, `art/variants/logo_smooth.glb`, `art/variants/logo_smooth.json`, `art/previews/logo_smooth.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; Lilita One font source above |
| `art/logo_blocks.blend`, `art/variants/logo_blocks.glb`, `art/variants/logo_blocks.json`, `art/previews/logo_blocks.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; actual Blender Blocks remesh of the same Lilita One text |
| `art/previews/logo-comparison.png` | https://github.com/zeidkazi/hop-brawl/blob/main/art/build_logo.py ; side-by-side native Blender renders |
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

## Street Brawl revisions

All six animal model/source/preview entries above now include original CC0 boxing gloves and white headbands with recolorable stripes authored by https://github.com/zeidkazi/hop-brawl/blob/main/art/brawler_gear.py . One neutral-color GLB per animal supports all player colors at runtime.

| Preview file | Source / license |
|---|---|
| `art/previews/fox-player-1.png` | Same fox geometry with coral gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-2.png` | Same fox geometry with blue gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-3.png` | Same fox geometry with green gear; brawler_gear.py above, CC0 1.0 |
| `art/previews/fox-player-4.png` | Same fox geometry with purple gear; brawler_gear.py above, CC0 1.0 |

## Announcer acquisition (milestone 11)

Find one consistent, energetic voice for: "Round one", "Round two", "Final round", "Showdown", "Hop!", "K.O.!", "Winner!". Search free voice packs, including Kenney and CC0-filtered OpenGameArt/Freesound sources. Verify each file's license; free download alone is not license permission. Record missing same-voice lines and ask the owner to record them at M11. Until then use text slams and SFX. No announcer files have been selected or downloaded yet.
