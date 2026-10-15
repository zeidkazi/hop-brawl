# Blender asset pipeline

Blender is mandatory. Set `BLENDER_PATH` to its executable in the environment or in the gitignored root `.env.local`. The committed launcher contains no machine-specific path and never builds meshes in Node.

```powershell
npm run art:build -- --version
npm run art:build -- --self-test
npm run art:build -- --model chicken
npm run art:build -- --model chicken --author
npm run art:build -- --model chicken --silhouette-only
npm run art:build -- --logo-variants
npm run art:build -- --menu-props
npm run art:build -- --arena
npm run art:build -- --street-logo
npm run art:build
```

The launcher invokes `blender -b --factory-startup --python-exit-code 1 -P art/build_models.py -- --config tmp/art-config.json`. Bake and render tunables are read from `shared/config.ts`; `tmp` is ignored.

Normal builds read committed voxel JSON. `--author` regenerates that JSON from `art/recipes/<name>.py` first; use it after changing a recipe. Both paths use Blender for all meshing, AO, exporting and PNG rendering. The self-test verifies interior-face removal, coplanar merging, independently closed parts, exact voxel volume across the entire library, and a real Cycles vertex-color bake without writing a production asset.

Voxel source coordinates use width, height, depth. One tile is 12 voxels; model origin is bottom-center, forward is Blender +Y / glTF -Z. Optional `parts` maps part names to voxel indices so eyes and tails can animate independently. These parts still share the one opaque vertex-color material.

The Blender builder removes faces inside each solid part and greedily merges adjacent coplanar faces of the same palette color before baking Cycles AO at 64 samples. Parts stay closed at their attachment surfaces, including eyes and tails. All geometry comes from full voxel volumes; there are no detached decorative planes. Baked vertex colors export to texture-free GLBs without Draco. The logo must remain below `ART.LOGO_GLB_BUDGET` (200,000 bytes); the complete library must remain below `ART.TOTAL_GLB_BUDGET`. Optional groups expose animation handles while keeping blinkable eyes separate.

Deliverables per asset: `art/voxels/<name>.json`, editable `art/<name>.blend`, `client/public/models/<name>.glb`, and transparent three-quarter `art/previews/<name>.png`. Preview lights/camera are excluded from GLB export. `--silhouette-only` opens the saved Blender scene and renders the same camera with black emission geometry on white, saving `<name>-silhouette.png` without changing the approved model, scene or color preview.

M2.5 approval gate: Street Brawl direction is approved. The final boxer/model pass under sections 29.7–29.9 awaits sign-off using art/review/SIGNOFF.md. The `m2.5-art-direction` tag is reserved for final acceptance before M3. Earlier contact sheets outside the signoff folder are historical review snapshots.

## Lilita One logo candidates

`--logo-variants` builds A (smooth) and B (Blocks) from real Blender Text objects using `art/fonts/LilitaOne-Regular.ttf`, with its OFL notice alongside. No bitmap alphabet is used. Editable Text sources are kept in a hidden collection in each .blend, and the font is packed. Text extrusion is 0.35, bevel 0.03; expanded Ink backing plates sit behind cream HOP and yellow BRAWL. Backing plates fill counters so small inner contours cannot invert under Text Offset. The chicken is perched on O facing the viewer. Layout, dimensions, colors and deterministic tilt/nudge settings live in shared/config.ts.

B applies Blender's actual Remesh modifier in Blocks mode at octree depth 5, scale 0.9, before coplanar simplification. Raster cross-sections were inspected across all eight glyphs: stems, bowls, diagonals and crossbars retain at least four blocks of stroke thickness. The shared layout preserves the same letter pivots and near-frontal camera in both candidates.

Files per candidate: `art/logo_smooth.blend` / `art/logo_blocks.blend`, their `art/variants/<name>.glb` exports and JSON manifests, and 1600x1000 `art/previews/<name>.png` renders on #87CEFA. `art/previews/logo-comparison.png` places A on the left and B on the right at native resolution. A is 182,904 bytes; B is 162,248 bytes. The build fails at 200,000 bytes. These original A/B candidates are archived outside runtime downloads. The Street Brawl export now supplies client/public/models/logo.glb.

Both use one opaque vertex-color material, Cycles AO, no textures and no Draco. `compact_glb.py` keeps full-precision positions and uses byte colors/normals with standard KHR_mesh_quantization, supported by the installed Three.js loader without a decoder. Unit tests load both actual exports through that loader and check node handles, bounds, material opacity, colors, normal precision, perch position, preview size and byte budgets.

## Archived A/B logo animation contract

Each candidate contains 27 nodes: nine animation handles and 18 mesh children. Letter handles own their face and backing meshes, so outline geometry moves with the letter. Pivot positions are at letter bases; preserve the loaded rotations and resting positions when applying animation. The chicken handle owns body and eyes. This logo faces Blender -Y / glTF +Z, unlike the gameplay animals; orient its root toward the Home camera.

| Purpose | Exact node names |
|---|---|
| HOP, in arrival order | `logo_HOP_H`, `logo_HOP_O`, `logo_HOP_P` |
| BRAWL, in arrival order | `logo_BRAWL_B`, `logo_BRAWL_R`, `logo_BRAWL_A`, `logo_BRAWL_W`, `logo_BRAWL_L` |
| Each letter's mesh children | `<handle>_face`, `<handle>_outline` |
| Chicken handle and children | `logo_chicken` -> `logo_chicken_body`, `logo_chicken_eyes` |

The owner originally selected A; section 29 subsequently replaced its mascot and expanded the backing in the Street Brawl export. The archived candidates use letters dropping one by one with squash/stretch, then the chicken hopping onto O last; the active export uses the fox. Idle uses a gentle bob and eye blinks. Preserve persistent canvas, quality tiers and reduced-motion behavior. The former punching glove, burst, road, dust, bitmap source and four-pose storyboard have been removed. Show Home at 390x844 and 1440x900 for approval before M3.


## Home scene controls

`--menu-props` builds `art/home_controls.blend`, `client/public/models/home_controls.glb` and `art/previews/home_controls.png`. Section 29.8 removes the wooden sign and labels; only the closed voxel `home_controls_arrow` ships, reused twice with Ink hulls. The animal name is screen-space Lilita One. Export only the combined baked color layer as COLOR_0. These original assets are listed in CREDITS.md.


## Street Brawl active assets

Animal `--author` builds apply art/brawler_gear.py after the anatomy recipe. Section 29.7 removes all headbands. The anatomy is preserved on a doubled authoring grid (`voxel_scale: 2`), allowing one-cell chamfers, thumb bumps and top-front highlights. `glove_left` and `glove_right` carry player_color=true; neutral AO colors are multiplied by player color. `cuff_left` and `cuff_right` stay white. Each fist/cuff pair belongs to a separate `glove_<side>_handle` at the wrist. Previews use coral; fox also renders all four colors from the same geometry. Source bounds include gear but do not change collision dimensions.

`--arena` exports art/arena.blend, client/public/models/arena.glb and art/previews/arena.png. Mesh arena_kind metadata identifies the instancing category. Every component is a closed voxel volume. Separate assets occupy separate spaces during AO baking; the exported meshes return to bottom-center before the preview layout is applied. Per-biome models include hay/pumpkin, snowy bleacher/scarf, and neon sign/spotlight.

`--street-logo` keeps smooth Lilita One, uses an 11% Ink backing, and perches the gloved fox on O at 2.5 times its former scale. The active mascot handle is logo_fox, with body/eyes/tail/glove_left/glove_right/cuff_left/cuff_right children. Letter handles retain the table above. Runtime face/backing pairs merge once per letter, retaining independent drop/squash animations. Section 29.8 keeps the backing visible on every tier. The preview uses emission from the same baked vertex colors as the unlit, fog-free runtime. Copy art/variants/logo_street.glb to client/public/models/logo.glb after verification. Font licensing is unchanged.

## Final sign-off evidence

`node scripts/audit-models.mjs` audits all runtime GLB surfaces and the 2 MB budget. `npm run build` then `npm run preview -- --port 4173` serves the production build; `node scripts/review-models.mjs` records five cache-cleared desktop loads and captures native camera lineups, six-frame move strips, both requested viewports and the logo comparison. Run it after regenerating all six `--silhouette-only` previews. Evidence is in art/review/ and art/previews/signoff/. The review script uses actual loaded models and the runtime move sampler, not mockups.

## Section 34 detail library

`npm run art:build -- --detail` builds the original CC0 flowers, tufts, bushes, stumps, pebbles, low fence pieces, lily pads, ducks, birds, butterflies, bus, ice-cream van and sports car. `detail_kind` metadata identifies the closed merged voxel meshes for instancing. Editable source is art/build_detail.py plus art/voxels/detail_props.json; the GLB, blend and preview share the same geometry. No runtime placement is part of the authoring command.
