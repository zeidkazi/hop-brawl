import type { Object3D } from 'three';
/** Only visible branches need world matrices. Hidden menu rigs remain asleep during a match. */
export function updateVisibleMatrices(node: Object3D, parentChanged = false): void {
  if (!node.visible) return;
  if (node.matrixAutoUpdate) node.updateMatrix();
  const changed = parentChanged || node.matrixWorldNeedsUpdate;
  if (changed) {
    if (node.parent) node.matrixWorld.multiplyMatrices(node.parent.matrixWorld, node.matrix);
    else node.matrixWorld.copy(node.matrix);
    node.matrixWorldNeedsUpdate = false;
  }
  for (const child of node.children) updateVisibleMatrices(child, changed);
}
