import { BackSide, InstancedMesh, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { COLORS, STREET } from '../../../shared/config';
import type { Tier } from './quality';

export type OutlineKind = 'animal' | 'vehicle' | 'logo' | 'prop';
export function outlinedAt(kind: OutlineKind, tier: Tier): boolean {
  return tier === 'high' || kind === 'animal' || (tier === 'medium' && (kind === 'vehicle' || kind === 'logo'));
}

/** Back-face hulls share instance buffers and never cast shadows. No screen pass. */
export class Outlines {
  readonly material = new MeshBasicMaterial({ color: COLORS.ink, side: BackSide, toneMapped: false });
  readonly entries: { source: Mesh; shell: Mesh; kind: OutlineKind }[] = [];
  add(source: Mesh, kind: OutlineKind): void {
    const geometry = source.geometry.clone(); geometry.computeBoundingBox();
    const center = geometry.boundingBox!.getCenter(new Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(STREET.OUTLINE_SCALE, STREET.OUTLINE_SCALE, STREET.OUTLINE_SCALE);
    geometry.translate(center.x, center.y, center.z);
    const shell = source instanceof InstancedMesh ? new InstancedMesh(geometry, this.material, source.count) : new Mesh(geometry, this.material);
    if (shell instanceof InstancedMesh && source instanceof InstancedMesh) {
      shell.instanceMatrix = source.instanceMatrix;
      shell.boundingSphere = source.boundingSphere?.clone() ?? null;
    }
    shell.name = source.name + '_hull'; shell.userData.outline = true;
    source.add(shell); this.entries.push({ source, shell, kind });
  }
  applyTier(tier: Tier): void {
    for (const entry of this.entries) entry.shell.visible = outlinedAt(entry.kind, tier);
  }
  sync(): void {
    for (const { source, shell } of this.entries) if (source instanceof InstancedMesh && shell instanceof InstancedMesh) shell.count = source.count;
  }
}
