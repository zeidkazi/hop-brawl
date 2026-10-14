# Blender asset pipeline

Blender is mandatory. Set `BLENDER_PATH` to its executable in the environment or in the gitignored root `.env.local`. The committed launcher contains no machine-specific path and never builds meshes in Node.

```powershell
npm run art:build -- --version
npm run art:build -- --self-test
npm run art:build -- --model chicken
npm run art:build -- --model chicken --author
npm run art:build -- --model chicken --silhouette-only
npm run art:build
```

The launcher invokes `blender -b --factory-startup --python-exit-code 1 -P art/build_models.py -- --config tmp/art-config.json`. Bake and render tunables are read from `shared/config.ts`; `tmp` is ignored.

Normal builds read committed voxel JSON. `--author` regenerates that JSON from `art/recipes/<name>.py` first; use it after changing a recipe. Both paths use Blender for all meshing, AO, exporting and PNG rendering. The self-test verifies interior-face removal, coplanar merging, independently closed parts, exact voxel volume across the entire library, and a real Cycles vertex-color bake without writing a production asset.

Voxel source coordinates use width, height, depth. One tile is 12 voxels; model origin is bottom-center, forward is Blender +Y / glTF -Z. Optional `parts` maps part names to voxel indices so eyes and tails can animate independently. These parts still share the one opaque vertex-color material.

The Blender builder removes faces inside each solid part and greedily merges adjacent coplanar faces of the same palette color before baking Cycles AO at 64 samples. Parts stay closed at their attachment surfaces, including eyes and tails. All geometry comes from full voxel volumes; there are no detached decorative planes. Baked vertex colors export to texture-free GLBs without Draco. The logo must remain below `ART.LOGO_GLB_BUDGET` (150,000 bytes); the complete library must remain below `ART.TOTAL_GLB_BUDGET`. Optional per-part rigid transforms give the logo reproducible individual letter tilts without deforming cubes.

Deliverables per asset: `art/voxels/<name>.json`, editable `art/<name>.blend`, `client/public/models/<name>.glb`, and transparent three-quarter `art/previews/<name>.png`. Preview lights/camera are excluded from GLB export. `--silhouette-only` opens the saved Blender scene and renders the same camera with black emission geometry on white, saving `<name>-silhouette.png` without changing the approved model, scene or color preview.

M2.5 approval gate: chicken, penguin and crate designs are owner-approved. The revised frog, fox, pig, cat, car, oak and logo are awaiting review; silhouettes are available for all six animals. Home changes wait for approval. The `m2.5-art-direction` tag is reserved for the completed, approved Home revision; it is not applied at the asset-preview checkpoint.
