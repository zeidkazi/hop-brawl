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

M2.5 approval gate: the previous Home was rejected. Section 29 boxing gear, arena roadside and gloved-fox logo now supersede its appearance. The Street Brawl Home screenshots await approval before M3. The `m2.5-art-direction` tag is reserved for completed, approved Home screenshots.

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

`--menu-props` builds `art/home_controls.blend`, `client/public/models/home_controls.glb` and `art/previews/home_controls.png`. The voxel arrow is `home_controls_arrow`; the closed wooden sign/post is `home_controls_sign`. Six separate `home_label_<animal>` meshes use the packed Lilita One font. The runtime shows only the selected label and reuses the arrow geometry twice. Export only the combined baked color layer as COLOR_0; exporting every Blender layer puts raw AO ahead of the intended wood/text colors. These original assets and their font provenance are listed in CREDITS.md.


## Street Brawl active assets

Animal `--author` builds apply art/brawler_gear.py after the anatomy recipe. `glove_left`, `glove_right` and `headband_stripe` carry player_color=true; their neutral vertex colors contain AO and are multiplied by player color at runtime. `headband` stays white. Glove meshes pivot at the wrist. Previews use coral, and fox additionally renders all four colors from the same geometry. Source bounds include oversized gear but do not change collision dimensions.

`--arena` exports art/arena.blend, client/public/models/arena.glb and art/previews/arena.png. Mesh arena_kind metadata identifies the instancing category. Every component is a closed voxel volume. Separate assets occupy separate spaces during AO baking; the exported meshes return to bottom-center before the preview layout is applied. Per-biome models include hay/pumpkin, snowy bleacher/scarf, and neon sign/spotlight.

`--street-logo` keeps smooth Lilita One, uses an 11% Ink backing, and perches the gloved fox on O. The active mascot handle is logo_fox, with logo_fox_body/eyes/tail/glove_left/glove_right/headband/headband_stripe children. Letter handles retain the table above. The runtime merges each letter's face/backing once into one draw on High/Medium, retaining face-only geometry for Low. This preserves the individual drop/squash animations while limiting draws. Copy art/variants/logo_street.glb to client/public/models/logo.glb after verification. Font licensing is unchanged.
