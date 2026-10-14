import { CONFIG, RAIL, SOUND } from '../../../shared/config';
import { trainCycle, trainWarning } from '../../../shared/hazards';
import type { Row } from '../../../shared/types';
import type { BoxingSound } from './boxing-feedback';

/** Bell follows the warning lamps; one horn per approach, including after a visibility resync. */
export class RailSound {
  private nextBell = 0;
  private readonly horns = new Set<number>();
  reset(): void { this.nextBell = 0; this.horns.clear(); }
  update(rows: readonly { z: number; row: Row | null }[], camZ: number, time: number, sound: BoxingSound): void {
    let warning = false;
    for (const slot of rows) {
      if (slot.row?.kind !== 'rail' || slot.z < camZ || slot.z > camZ + CONFIG.VIEW_ROWS + 10) continue;
      const row = slot.row; warning ||= trainWarning(row, time);
      const horn = trainCycle(row, time) >= row.period - SOUND.HORN_BEFORE_S;
      if (horn && !this.horns.has(slot.z)) { sound.play('horn', -row.direction, SOUND.HAZARD_GAIN); this.horns.add(slot.z); }
      if (!horn) this.horns.delete(slot.z);
    }
    if (warning && time >= this.nextBell) { sound.play('bell', 0, SOUND.HAZARD_GAIN); this.nextBell = time + RAIL.BELL_INTERVAL_S; }
    for (const z of this.horns) if (z < camZ) this.horns.delete(z);
  }
}
