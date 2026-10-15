import { expect, it } from 'vitest';
import { grassSceneryAllowed } from '../../shared/scenery';
import { STREET, VIEW } from '../../shared/config';
import { generateRow } from '../../shared/worldgen';
it('scans 1000 seeds: grass-only scenery footprints and arena setback', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const rows = Array.from({ length: 300 }, (_, z) => generateRow(seed, z));
    for (let z = 0; z < rows.length; z++) {
      expect(grassSceneryAllowed(n => rows[n], -4, -3, z - VIEW.TREE_ROW_DEPTH * STREET.OUTLINE_SCALE / 2, z + VIEW.TREE_ROW_DEPTH * STREET.OUTLINE_SCALE / 2, 2)).toBe(rows[z]!.kind === 'grass');
      if (grassSceneryAllowed(n => rows[n], 11, 12, z, z + 2, 2))
        for (let n = z; n <= z + 2; n++) expect(rows[n]?.kind).toBe('grass');
      expect(grassSceneryAllowed(n => rows[n], 9, 10, z, z, 2)).toBe(false);
    }
  }
}, 30000);

it('rejects canopies touching either hazard edge, including outline and kerb clearance', () => {
  const rows = [generateRow(0, 0), Array.from({ length: 20 }, (_, z) => generateRow(0, z)).find(row => row.kind === 'road')!, generateRow(0, 0)];
  const at = (z: number) => rows[z];
  expect(grassSceneryAllowed(at, -4, -3, -.4, .5)).toBe(false);
  expect(grassSceneryAllowed(at, -4, -3, 1.5, 2.4)).toBe(false);
  expect(grassSceneryAllowed(at, -4, -3, 1.6, 2.4)).toBe(true);
  expect(VIEW.TREE_ROW_DEPTH * STREET.OUTLINE_SCALE / 2 + VIEW.SCENERY_ROW_GAP).toBeLessThan(.5);
});
