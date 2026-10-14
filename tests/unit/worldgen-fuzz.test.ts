import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { CONFIG, WORLD } from '../../shared/config';
import { mulberry32 } from '../../shared/rng';
import type { Row, RowKind } from '../../shared/types';
import { generateRow } from '../../shared/worldgen';

describe('required generator fuzz', () => {
  it('satisfies every §10 guarantee for 1,000 random seeds × 300 rows', { timeout: 60_000 }, () => {
    // Reproducible random seed stream; failures include the exact world seed/row.
    const random = mulberry32(0x686f7062);
    const seen = new Set<RowKind>();
    let crates = 0;
    let riverPairs = 0;
    for (let sample = 0; sample < 1000; sample++) {
      const seed = Math.floor(random() * 0x100000000);
      let previous: Row | undefined;
      let streak = 0;
      for (let z = 0; z < 300; z++) {
        const row = generateRow(seed, z);
        const at = `seed=${seed}, row=${z}, kind=${row.kind}`;
        seen.add(row.kind);
        streak = previous?.kind === row.kind ? streak + 1 : 1;
        assert.deepEqual(generateRow(seed, z), row, `determinism: ${at}`);
        assert.equal(row.z, z, at);
        if (z <= 4) assert.equal(row.kind, 'grass', `starting grass: ${at}`);
        if (z >= 5 && z <= 14) assert.notEqual(row.kind, 'rail', `early rail: ${at}`);

        if (row.kind === 'grass') {
          const columns = row.obstacles.map(obstacle => obstacle.column);
          assert(columns.length <= 3, `obstacle count: ${at}`);
          assert.equal(new Set(columns).size, columns.length, `duplicate obstacle: ${at}`);
          // Stronger than required: every grass row, not just those between hazards.
          assert(CONFIG.COLUMNS - columns.length >= 4, `safe columns: ${at}`);
          for (const column of columns) {
            assert(Number.isInteger(column) && column >= 0 && column <= 8, `column: ${at}`);
            if (z <= 4) assert(column === 0 || column === 8, `blocked spawn: ${at}`);
          }
          if (row.crate) {
            crates++;
            assert(z >= 8, `early crate: ${at}`);
            assert(!columns.includes(row.crate.column), `blocked crate: ${at}`);
            assert(Number.isInteger(row.crate.column) && row.crate.column >= 0 && row.crate.column <= 8, `crate column: ${at}`);
          }
        } else if (row.kind === 'rail') {
          assert.equal(streak, 1, `adjacent rails: ${at}`);
          assert(z > 5, `rail adjacent to starting respawn rows: ${at}`);
          assert(row.period >= 6 && row.period <= 10, `train period: ${at}`);
          assert(row.phase >= 0 && row.phase < row.period, `train phase: ${at}`);
        } else {
          const gain = Math.min(1, z / 150);
          const river = row.kind === 'river';
          const items = river ? row.logs : row.vehicles;
          const limit = river ? 3 : z <= 14 ? 2 : 4;
          assert(streak <= limit, `lane streak: ${at}`);
          assert(row.direction === 1 || row.direction === -1, `direction: ${at}`);
          assert(row.phase >= 0 && row.phase < 21, `lane phase: ${at}`);
          if (river) {
            assert(row.speed >= 1 + 0.5 * gain && row.speed <= 2.2 * (1 + 0.5 * gain), `river speed: ${at}`);
            if (previous?.kind === 'river') {
              riverPairs++;
              assert.equal(row.direction, -previous.direction, `river direction: ${at}`);
              assert.notEqual(row.speed, previous.speed, `equal river speeds: ${at}`);
            }
          } else {
            const cap = z <= 14 ? 2 : Infinity;
            assert(row.speed >= Math.min(cap, 1.5 * (1 + 0.8 * gain)), `road minimum speed: ${at}`);
            assert(row.speed <= Math.min(cap, 3 * (1 + 0.8 * gain)), `road maximum speed: ${at}`);
          }
          for (let i = 0; i < items.length; i++) {
            const current = items[i]!;
            const next = items[(i + 1) % items.length]!;
            const distance = next.offset + (i === items.length - 1 ? 21 : 0) - current.offset;
            const gap = distance - (current.length + next.length) / 2;
            assert(gap >= (river ? 1.5 : 3) - 1e-10, `short gap: ${at}, item=${i}`);
            assert(gap <= (river ? 3 : 7) + 1e-10, `long gap: ${at}, item=${i}`);
            if (river) {
              assert(current.length >= 2 && current.length <= 4, `log length: ${at}`);
              assert(distance / row.speed <= 2.5 + 1e-10, `log arrival: ${at}, item=${i}`);
            } else {
              assert(gap / row.speed >= 0.6 - 1e-10, `road time gap: ${at}, item=${i}`);
            }
          }
        }
        previous = row;
      }
    }
    expect([...seen].sort()).toEqual(['grass', 'rail', 'river', 'road']);
    expect(crates).toBeGreaterThan(0);
    expect(riverPairs).toBeGreaterThan(0);
  });

  it('reconstructs a streamed window far into a run, including negative starting rows', () => {
    for (const camZ of [0, 50, 1000, 1_000_000]) {
      const window = [];
      for (let z = camZ - WORLD.STREAM_BEHIND_ROWS; z <= camZ + WORLD.STREAM_AHEAD_ROWS; z++) {
        window.push(generateRow(0xffffffff, z));
      }
      expect(window).toHaveLength(25);
      for (const row of window.reverse()) expect(row).toEqual(generateRow(0xffffffff, row.z));
    }
  });
});
