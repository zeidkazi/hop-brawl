# Blender asset pipeline

Blender is mandatory. Set `BLENDER_PATH` to its executable in the environment or in the gitignored root `.env.local`. The committed launcher contains no machine-specific path and never builds meshes in Node.

```powershell
npm run art:build -- --version
npm run art:build -- --self-test
npm run art:build -- --model chicken
npm run art:build -- --model chicken --author
npm run art:build
```

The launcher invokes `blender -b --factory-startup --python-exit-code 1 -P art/build_models.py -- --config tmp/art-config.json`. Bake and render tunables are read from `shared/config.ts`; `tmp` is ignored.

Normal builds read committed voxel JSON. `--author` regenerates that JSON from `art/recipes/<name>.py` first; use it after changing a recipe. Both paths use Blender for all meshing, AO, exporting and PNG rendering. The self-test verifies internal-face removal and a real Cycles vertex-color bake without writing a production asset.

Voxel source coordinates use width, height, depth. One tile is 12 voxels; model origin is bottom-center, forward is Blender +Y / glTF -Z. Optional `parts` maps part names to voxel indices so eyes and tails can animate independently. These parts still share the one opaque vertex-color material.

The Blender builder removes internal faces, bakes Cycles AO at 64 samples to vertex colors, applies that shading to the base palette and exports texture-free GLBs without Draco. Deliverables per asset: `art/voxels/<name>.json`, editable `art/<name>.blend`, `client/public/models/<name>.glb`, and transparent three-quarter `art/previews/<name>.png`. Preview lights/camera are excluded from GLB export.

M2.5 approval gate: logo, six animals, car, oak and crate previews first. Home changes wait for owner approval. The `m2.5-art-direction` tag is reserved for the completed, approved Home revision; it is not applied at the asset-preview checkpoint.
