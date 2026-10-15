import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('exports all thirteen Blender detail shapes as opaque, closed voxel parts without textures', () => {
  const bytes=readFileSync('client/public/models/detail_props.glb');
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const names=['flowers','grass_tuft','small_bush','stump','pebbles','fence_piece','lily_pad','duck','bird','butterfly','bus','ice_cream_van','sports_car'];
  expect(doc.asset.generator).toContain('Blender'); expect(doc.images??[]).toEqual([]); expect(doc.textures??[]).toEqual([]);
  for(const name of names) {
    const node=doc.nodes.find((n:{extras?:{detail_kind?:string}})=>n.extras?.detail_kind===name);
    expect(node.extras.surface_mesher).toBe('closed-part-greedy-v1'); expect(node.extras.ao_samples).toBe(64);
    for(const primitive of doc.meshes[node.mesh].primitives)expect(primitive.attributes.COLOR_0).toBeDefined();
  }
  for(const material of doc.materials) { expect(material.alphaMode??'OPAQUE').toBe('OPAQUE'); expect(material.doubleSided??false).toBe(false); }
  expect(bytes.length).toBeLessThan(100000);
});
