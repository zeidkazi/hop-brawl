import { Box3, BufferGeometry, Group, Matrix4, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Loading-only conversion: approved Blender geometry, normalized for pooled instance transforms. */
export function normalizedModel(model: Group, translations?: readonly number[]): BufferGeometry {
  model.updateMatrixWorld(true);
  const pieces: BufferGeometry[] = [];
  const translate = new Matrix4();
  for (const x of translations ?? [0]) {
    translate.makeTranslation(x, 0, 0);
    model.traverse(node => {
      if (!(node instanceof Mesh) || node.userData.outline) return;
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld).applyMatrix4(translate);
      geometry.deleteAttribute('uv'); geometry.deleteAttribute('uv1'); pieces.push(geometry);
    });
  }
  const merged = mergeGeometries(pieces)!;
  for (const geometry of pieces) geometry.dispose();
  const bounds = new Box3().setFromBufferAttribute(merged.getAttribute('position') as import('three').BufferAttribute);
  const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  merged.translate(-center.x, -center.y, -center.z);
  merged.scale(1 / size.x, 1 / size.y, 1 / size.z);
  return merged;
}
