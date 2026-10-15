import { strict as assert } from 'node:assert';
import { expect, it } from 'vitest';
import { CONFIG, DETAIL, SEGMENTS } from '../../shared/config';
import { grassDecor, vehicleStyle } from '../../shared/world-detail';
import { hash32 } from '../../shared/rng';
import { generateRow } from '../../shared/worldgen';
import { segmentAt, tierAt } from '../../shared/segments';
it('scans 1000 seeds: 3-6 low decorations on grass, outside corridors and obstacle cells', () => {
  for (let seed = 0; seed < 1000; seed++) for (let z = 0; z < 160; z++) {
    const row = generateRow(seed, z); if (row.kind !== 'grass') continue;
    const props = grassDecor(seed, row), segment = segmentAt(seed,z), corridor = hash32(seed,segment.start) % (CONFIG.COLUMNS-SEGMENTS.CORRIDOR_COLUMNS+1);
    assert(props.length >= 3 && props.length <= 6);
    assert(new Set(props.map(p=>p.x)).size === props.length);
    for (const p of props) { assert(p.x < corridor || p.x >= corridor+SEGMENTS.CORRIDOR_COLUMNS); assert(!row.obstacles.some(o=>o.column===p.x)); }
  }
}, 30000);
it('gives every vehicle a distinct speed band within its tier without changing the lane schedule', () => {
  const row = { kind: 'road' as const, z: 60, biome: 'meadow' as const, direction: 1 as const, speed: 0, phase: 0, vehicles: [] };
  const tier = tierAt(60);
  for (const kind of ['car', 'truck'] as const) {
    const styles = kind === 'car' ? DETAIL.CAR_STYLES : DETAIL.TRUCK_STYLES;
    styles.forEach((style,i)=> { row.speed=tier.car[0]+(tier.car[1]-tier.car[0])*(i+.5)/styles.length; expect(vehicleStyle(row,{kind,length:1,offset:0})).toBe(style); });
  }
});
