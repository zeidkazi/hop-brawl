import { expect, it } from 'vitest';
import { grassSceneryAllowed } from '../../shared/scenery';
import { generateRow } from '../../shared/worldgen';
it('scans 1000 seeds: grass-only scenery footprints and arena setback', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const rows = Array.from({ length: 300 }, (_, z) => generateRow(seed, z));
    for (let z = 0; z < rows.length; z++) {
      expect(grassSceneryAllowed(n => rows[n], -4, -3, z - .49, z + .49, 2)).toBe(rows[z]!.kind === 'grass');
      if (grassSceneryAllowed(n => rows[n], 11, 12, z, z + 2, 2))
        for (let n = z; n <= z + 2; n++) expect(rows[n]?.kind).toBe('grass');
      expect(grassSceneryAllowed(n => rows[n], 9, 10, z, z, 2)).toBe(false);
    }
  }
}, 30000);
