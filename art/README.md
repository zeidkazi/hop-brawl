# Blender asset pipeline

Blender is mandatory. Set `BLENDER_PATH` to its executable in the environment or in the gitignored root `.env.local`. The committed launcher contains no machine-specific path and never builds meshes in Node.

```powershell
npm run art:build -- --version
npm run art:build -- --self-test
npm run art:build -- --model chicken
npm run art:build -- --model chicken --author
npm run art:build -- --model chicken --silhouette-only
npm run art:build -- --logo-variants
npm run art:build
```

The launcher invokes `blender -b --factory-startup --python-exit-code 1 -P art/build_models.py -- --config tmp/art-config.json`. Bake and render tunables are read from `shared/config.ts`; `tmp` is ignored.

Normal builds read committed voxel JSON. `--author` regenerates that JSON from `art/recipes/<name>.py` first; use it after changing a recipe. Both paths use Blender for all meshing, AO, exporting and PNG rendering. The self-test verifies interior-face removal, coplanar merging, independently closed parts, exact voxel volume across the entire library, and a real Cycles vertex-color bake without writing a production asset.

Voxel source coordinates use width, height, depth. One tile is 12 voxels; model origin is bottom-center, forward is Blender +Y / glTF -Z. Optional `parts` maps part names to voxel indices so eyes and tails can animate independently. These parts still share the one opaque vertex-color material.

The Blender builder removes faces inside each solid part and greedily merges adjacent coplanar faces of the same palette color before baking Cycles AO at 64 samples. Parts stay closed at their attachment surfaces, including eyes and tails. All geometry comes from full voxel volumes; there are no detached decorative planes. Baked vertex colors export to texture-free GLBs without Draco. The logo must remain below `ART.LOGO_GLB_BUDGET` (200,000 bytes); the complete library must remain below `ART.TOTAL_GLB_BUDGET`. Optional groups expose animation handles while keeping blinkable eyes separate.

Deliverables per asset: `art/voxels/<name>.json`, editable `art/<name>.blend`, `client/public/models/<name>.glb`, and transparent three-quarter `art/previews/<name>.png`. Preview lights/camera are excluded from GLB export. `--silhouette-only` opens the saved Blender scene and renders the same camera with black emission geometry on white, saving `<name>-silhouette.png` without changing the approved model, scene or color preview.

M2.5 approval gate: all six animals, oak, crate, car, hatchback, taxi, engine, carriage and log are approved. The truck has a solid painted rear cab wall and no forward grey cargo trim; its updated preview is ready. The owner chooses logo A or B next, then Home implementation proceeds immediately. The `m2.5-art-direction` tag is reserved for completed, approved Home screenshots.

## Lilita One logo candidates

`--logo-variants` builds A (smooth) and B (Blocks) from real Blender Text objects using `art/fonts/LilitaOne-Regular.ttf`, with its OFL notice alongside. No bitmap alphabet is used. Editable Text sources are kept in a hidden collection in each .blend, and the font is packed. Text extrusion is 0.35, bevel 0.03; expanded Ink backing plates sit behind cream HOP and yellow BRAWL. Backing plates fill counters so small inner contours cannot invert under Text Offset. The chicken is perched on O facing the viewer. Layout, dimensions, colors and deterministic tilt/nudge settings live in shared/config.ts.

B applies Blender's actual Remesh modifier in Blocks mode at octree depth 5, scale 0.9, before coplanar simplification. Raster cross-sections were inspected across all eight glyphs: stems, bowls, diagonals and crossbars retain at least four blocks of stroke thickness. The shared layout preserves the same letter pivots and near-frontal camera in both candidates.

Files per candidate: `art/logo_smooth.blend` / `art/logo_blocks.blend`, their `art/variants/<name>.glb` exports and JSON manifests, and 1600x1000 `art/previews/<name>.png` renders on #87CEFA. `art/previews/logo-comparison.png` places A on the left and B on the right at native resolution. A is 182,904 bytes; B is 162,248 bytes. The build fails at 200,000 bytes. Candidates stay outside public runtime downloads until one is selected.

Both use one opaque vertex-color material, Cycles AO, no textures and no Draco. `compact_glb.py` keeps full-precision positions and uses byte colors/normals with standard KHR_mesh_quantization, supported by the installed Three.js loader without a decoder. Unit tests load both actual exports through that loader and check node handles, bounds, material opacity, colors, normal precision, perch position, preview size and byte budgets.

## Logo animation contract

Each candidate contains 27 nodes: nine animation handles and 18 mesh children. Letter handles own their face and backing meshes, so outline geometry moves with the letter. Pivot positions are at letter bases; preserve the loaded rotations and resting positions when applying animation. The chicken handle owns body and eyes. This logo faces Blender -Y / glTF +Z, unlike the gameplay animals; orient its root toward the Home camera.

| Purpose | Exact node names |
|---|---|
| HOP, in arrival order | `logo_HOP_H`, `logo_HOP_O`, `logo_HOP_P` |
| BRAWL, in arrival order | `logo_BRAWL_B`, `logo_BRAWL_R`, `logo_BRAWL_A`, `logo_BRAWL_W`, `logo_BRAWL_L` |
| Each letter's mesh children | `<handle>_face`, `<handle>_outline` |
| Chicken handle and children | `logo_chicken` -> `logo_chicken_body`, `logo_chicken_eyes` |

After selection, copy that candidate to `client/public/models/logo.glb` and proceed directly to Home. Animate the letters dropping one by one with squash/stretch, then the chicken hopping onto O last. Idle uses a gentle bob and eye blinks. Preserve persistent canvas, quality tiers and reduced-motion behavior. The glove, burst, road, dust, bitmap source and former four-pose storyboard have been removed. Show Home at 390x844 and 1440x900 for approval before M3.
