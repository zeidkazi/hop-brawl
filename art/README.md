# Blender asset pipeline

Blender is mandatory. Set `BLENDER_PATH` to its executable in the environment or in the gitignored root `.env.local`. The committed launcher contains no machine-specific path and never builds meshes in Node.

```powershell
npm run art:build -- --version
npm run art:build -- --self-test
npm run art:build -- --model chicken
npm run art:build -- --model chicken --author
npm run art:build -- --model chicken --silhouette-only
npm run art:build -- --logo-poses
npm run art:build
```

The launcher invokes `blender -b --factory-startup --python-exit-code 1 -P art/build_models.py -- --config tmp/art-config.json`. Bake and render tunables are read from `shared/config.ts`; `tmp` is ignored.

Normal builds read committed voxel JSON. `--author` regenerates that JSON from `art/recipes/<name>.py` first; use it after changing a recipe. Both paths use Blender for all meshing, AO, exporting and PNG rendering. The self-test verifies interior-face removal, coplanar merging, independently closed parts, exact voxel volume across the entire library, and a real Cycles vertex-color bake without writing a production asset.

Voxel source coordinates use width, height, depth. One tile is 12 voxels; model origin is bottom-center, forward is Blender +Y / glTF -Z. Optional `parts` maps part names to voxel indices so eyes and tails can animate independently. These parts still share the one opaque vertex-color material.

The Blender builder removes faces inside each solid part and greedily merges adjacent coplanar faces of the same palette color before baking Cycles AO at 64 samples. Parts stay closed at their attachment surfaces, including eyes and tails. All geometry comes from full voxel volumes; there are no detached decorative planes. Baked vertex colors export to texture-free GLBs without Draco. The logo must remain below `ART.LOGO_GLB_BUDGET` (200,000 bytes); the complete library must remain below `ART.TOTAL_GLB_BUDGET`. Per-part transforms support reproducible letter tilts, the chicken's forward pitch, and the owner-requested continuous R diagonal via a volume-preserving shear. Optional groups expose animation handles while keeping blinkable eyes separate.

Deliverables per asset: `art/voxels/<name>.json`, editable `art/<name>.blend`, `client/public/models/<name>.glb`, and transparent three-quarter `art/previews/<name>.png`. Preview lights/camera are excluded from GLB export. `--silhouette-only` opens the saved Blender scene and renders the same camera with black emission geometry on white, saving `<name>-silhouette.png` without changing the approved model, scene or color preview.

M2.5 approval gate: all six animals, oak and crate are owner-approved. The lowered sedan, hatchback, taxi, truck, train engine/carriage, log and composed logo are awaiting review. Home changes wait for approval. The `m2.5-art-direction` tag is reserved for the completed, approved Home revision.

## Logo animation contract

The single `logo.glb` contains 19 named nodes (17 meshes and two parent handles), one opaque vertex-color material, and no textures. Positions are in tiles; node pivots are at letter bases, the chicken's perch, glove cuff and burst center. Geometry transforms are baked; preserve each loaded node's resting transform when animating. The road is the stable base.

| Purpose | Exact node names |
|---|---|
| HOP letters, in arrival order | `logo_HOP_H`, `logo_HOP_O`, `logo_HOP_P` |
| BRAWL letters, in arrival order | `logo_BRAWL_B`, `logo_letter_R`, `logo_BRAWL_A`, `logo_BRAWL_W`, `logo_BRAWL_L` |
| R children (animate their parent) | `logo_BRAWL_R`, `logo_BRAWL_R_diagonal` |
| Chicken handle and children | `logo_chicken` → `logo_chicken_body`, `logo_chicken_eyes` |
| Punch / hit / base | `logo_glove`, `logo_starburst`, `logo_road_strip` |
| Dust puffs | `logo_dust_H`, `logo_dust_O`, `logo_dust_P` |

`--logo-poses` opens the saved .blend and renders four key poses from its existing camera into the 2400×384 `art/previews/logo-intro.png`: HOP arrival; BRAWL arrival with chicken descending; chicken perched and glove wound back; glove impact, starburst pop and BRAWL shake. Source frames are temporary files under ignored `tmp/`. Render-buffer assembly verifies color fidelity. Pose tunables are in shared/config.ts. This is a storyboard, not an embedded animation clip or runtime Home implementation.

After owner approval, Home must animate HOP letters one by one, then BRAWL letters, land the chicken on P, punch with the glove, pop the starburst and shake only the BRAWL handles. Idle keeps a gentle bob, toggles the chicken eye mesh for blinks, and performs occasional small glove jabs. Keep the road stable and preserve the persistent canvas, quality tiers and reduced-motion behavior. Do not rotate only the R body: its parent owns both its bowl/stem and continuous diagonal.
