import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONFIG, SEGMENTS, WORLD } from '../../shared/config';
import { mulberry32 } from '../../shared/rng';
import { segmentAt, tierAt } from '../../shared/segments';
import { generateRow } from '../../shared/worldgen';
import type { Vehicle } from '../../shared/types';

describe('section 30 segment fuzz', () => {
  it('audits every tier, corridor, separator, rest stop and schedule over 1000 seeds x 300 rows', { timeout: 60000 }, () => {
    const random = mulberry32(0x686f7062);
    let riverPairs = 0, restCrates = 0, restRows = 0, normalCrates = 0, normalRows = 0, segments = 0;
    const seen = new Set<string>();
    for (let sample = 0; sample < 1000; sample++) {
      const seed = Math.floor(random() * 0x100000000);
      const rows = Array.from({ length: 305 }, (_, z) => generateRow(seed, z));
      let firstRail = true;
      for (let z = 0; z < 300; z++) {
        const row = rows[z]!, segment = segmentAt(seed, z), tier = tierAt(z), at = `seed=${seed}, z=${z}`;
        seen.add(row.kind); assert.deepEqual(row, generateRow(seed, z), at);
        if (z <= 4) assert.equal(row.kind, 'grass', at);
        if (z < 10 && row.kind !== 'grass') { assert.equal(row.kind, 'road', at); assert.equal(segment.end - segment.start, 1, at); }
        if (segment.start === z) {
          segments++;
          const length = segment.end - segment.start;
          if (row.kind !== 'grass') {
            assert.equal(rows[z - 1]?.kind, 'grass', `preceding grass ${at}`);
            assert.equal(rows[segment.end]?.kind, 'grass', `following grass ${at}`);
            const range = tier[row.kind]; assert(length >= range[0] && length <= range[1], `segment length ${at}`);
          } else {
            if (segment.rest) assert.equal(length, SEGMENTS.REST_ROWS, at);
            else if (z !== 0) assert(length >= tier.grass[0] && length <= tier.grass[1], `breather ${at}`);
            const clear = new Set(Array.from({ length: CONFIG.COLUMNS }, (_, x) => x));
            for (let n = z; n < segment.end; n++) {
              const grass = rows[n]!; assert.equal(grass.kind, 'grass', at);
              if (grass.kind === 'grass') for (const obstacle of grass.obstacles) clear.delete(obstacle.column);
            }
            assert(clear.size >= SEGMENTS.CORRIDOR_COLUMNS, `corridor ${at}`);
          }
        }
        if (z >= 20 && z % SEGMENTS.REST_EVERY === 0) assert(segment.rest && segment.start === z, `rest interval ${at}`);
        if (row.kind === 'grass') {
          const columns = row.obstacles.map(item => item.column);
          assert.equal(new Set(columns).size, columns.length, at);
          assert(columns.length <= tier.obstacles, `obstacle tier ${at}`);
          if ((z && rows[z - 1]!.kind !== 'grass') || rows[z + 1]!.kind !== 'grass') assert(columns.length <= 1, `hazard edge ${at}`);
          if (z <= 4) assert(columns.every(x => x === 0 || x === 8), `spawn ${at}`);
          if (segment.rest) assert(columns.every(x => x < 2 || x > 6), `rest corridor ${at}`);
          if (row.crate) assert(z >= 8 && !columns.includes(row.crate.column), `crate ${at}`);
          if (z >= 8) { if (segment.rest) { restRows++; restCrates += Number(!!row.crate); } else { normalRows++; normalCrates += Number(!!row.crate); } }
        } else if (row.kind === 'road') {
          assert(row.speed >= tier.car[0] && row.speed <= tier.car[1], `car speed ${at}`);
          const previous = rows[z - 1];
          if (previous?.kind === 'road') {
            assert(Math.max(previous.speed, row.speed) >= Math.min(previous.speed, row.speed) * SEGMENTS.ROAD_SPEED_RATIO - 1e-10, `speed contrast ${at}`);
            const before = rows[z - 2];
            if (before?.kind === 'road') assert(!(before.direction === previous.direction && previous.direction === row.direction), `directions ${at}`);
          }
          for (let i = 0; i < row.vehicles.length; i++) {
            const item: Vehicle = row.vehicles[i]!;
            const next: Vehicle = row.vehicles[(i + 1) % row.vehicles.length]!;
            if (z < 25) assert.equal(item.kind, 'car', `early truck ${at}`);
            const gap = next.offset + (i === row.vehicles.length - 1 ? 21 : 0) - item.offset - (item.length + next.length) / 2;
            assert(gap >= WORLD.ROAD_GAP_MIN - 1e-9 && gap <= WORLD.ROAD_GAP_MAX + 1e-9, `car gap ${at}`);
            assert(gap / row.speed >= CONFIG.MIN_ROAD_TIME_GAP_S - 1e-9, at);
          }
        } else if (row.kind === 'river') {
          assert(row.speed >= tier.log[0] && row.speed <= tier.log[1] && row.speed < tier.car[0], `log speed ${at}`);
          const pitch = 21 / row.logs.length, length = row.logs[0]!.length;
          assert(length >= tier.length[0] && length <= tier.length[1], `log length ${at}`);
          assert(pitch >= length, `overlapping logs ${at}`);
          // Slot centers are one tile apart; 0.6 reach makes each log's safe interval contiguous.
          const gapSeconds = Math.max(0, pitch - (length - 1 + 2 * SEGMENTS.LOG_SLOT_REACH)) / row.speed;
          assert(gapSeconds <= SEGMENTS.LOG_WAIT_S, `maximum uncovered wait at every column ${at}`);
          const previous = rows[z - 1];
          if (previous?.kind === 'river') {
            riverPairs++; assert.equal(row.direction, -previous.direction, at);
            assert.equal(row.speed, previous.speed, at); assert.equal(row.logs[0]!.length, previous.logs[0]!.length, at);
            // Exact periodic bound, independent of phase or column: two gap intervals per period.
            // Eroding availability by 0.5s leaves a valid start, and even joined forbidden starts
            // cannot defer a complete 0.5s overlap beyond 3s. This holds at ALL real times.
            const period = pitch / row.speed, window = SEGMENTS.OVERLAP_WINDOW_S;
            assert(period - 2 * gapSeconds >= 2 * window, `overlap exists ${at}`);
            assert(2 * (gapSeconds + window) + window <= SEGMENTS.OVERLAP_PERIOD_S, `overlap frequency ${at}`);
          }
        } else {
          assert(z >= 30, `early rail ${at}`);
          assert(row.period >= 7 && row.period <= 10, `train period ${at}`);
          assert.equal(row.warning, tier.warning, `warning ${at}`);
          if (firstRail) { assert.equal(rows[z - 1]?.kind, 'grass', at); assert.equal(rows[z - 2]?.kind, 'grass', at); firstRail = false; }
        }
      }
    }
    expect([...seen].sort()).toEqual(['grass', 'rail', 'river', 'road']);
    expect(restCrates / restRows).toBeGreaterThan(.47); expect(restCrates / restRows).toBeLessThan(.53);
    expect(normalCrates / normalRows).toBeGreaterThan(.22); expect(normalCrates / normalRows).toBeLessThan(.28);
    const report = { seeds: 1000, rows: 300000, segments, riverPairs, restCrateRate: restCrates / restRows, normalCrateRate: normalCrates / normalRows };
    if (process.env.FUZZ_REPORT) writeFileSync(process.env.FUZZ_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  });
  it('reconstructs arbitrary distant streamed windows without replaying earlier chapters', () => {
    for (const camZ of [0, 50, 1000, 1000000]) {
      const rows = Array.from({ length: 25 }, (_, i) => generateRow(0xffffffff, camZ - WORLD.STREAM_BEHIND_ROWS + i));
      for (const row of rows.reverse()) expect(generateRow(0xffffffff, row.z)).toEqual(row);
    }
  });
});
