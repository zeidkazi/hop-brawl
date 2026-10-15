import { CONFIG, RAIL, SOUND, WORLD } from '../../../shared/config';
import { trainCycle, trainWarning, trainX } from '../../../shared/hazards';
import type { Row } from '../../../shared/types';
import type { BoxingSound } from './audio';
import { spatial } from './audio-policy';
/** Bell originates at both posts. Horn fires once per approach; train pan follows its position. */
export class RailSound {
  private readonly nextBell = new Map<number, number>();
  private readonly horns = new Set<number>();
  reset(): void { this.nextBell.clear(); this.horns.clear(); }
  update(rows: readonly { z: number; row: Row | null }[], camZ: number, time: number, sound: BoxingSound, playerX = 4, playerZ = camZ + 1): void {
    for (const slot of rows) {
      if (slot.row?.kind !== 'rail' || slot.z < camZ || slot.z > camZ + CONFIG.VIEW_ROWS + 10) continue;
      const row = slot.row, cycle = trainCycle(row, time), warning = trainWarning(row, time);
      const reach = CONFIG.VIEW_ROWS + 10, attenuation = Math.max(.25, 1 - Math.abs(slot.z - playerZ) / reach);
      const horn = cycle >= row.period - SOUND.HORN_BEFORE_S;
      if (horn && !this.horns.has(slot.z)) { sound.play('horn', -row.direction, SOUND.WARNING_GAIN * attenuation); this.horns.add(slot.z); }
      if (!horn) this.horns.delete(slot.z);
      if (warning) {
        if (time >= (this.nextBell.get(slot.z) ?? 0)) {
          for (const x of RAIL.POST_X) sound.play('bell', spatial(x, slot.z, playerX, playerZ, reach).pan, SOUND.WARNING_GAIN * attenuation / Math.sqrt(RAIL.POST_X.length));
          this.nextBell.set(slot.z, time + RAIL.BELL_INTERVAL_S * 2);
        }
        const warningS = row.warning ?? WORLD.TRAIN_WARNING_S; const progress = (cycle - row.period + warningS) / warningS;
        sound.loop(`rumble-${slot.z}`, 'rumble', -row.direction, SOUND.TRAIN_GAIN * attenuation * progress);
      }
      const x = trainX(row, time);
      if (x !== null && x > WORLD.LOOP_MIN_X - WORLD.TRAIN_LENGTH && x < WORLD.LOOP_MAX_X + WORLD.TRAIN_LENGTH) {
        sound.loop(`train-${slot.z}`, 'train', Math.max(-1, Math.min(1, (x - playerX) / SOUND.PAN_TILES)), SOUND.TRAIN_GAIN * attenuation);
      }
    }
    for (const z of this.nextBell.keys()) if (z < camZ) this.nextBell.delete(z);
    for (const z of this.horns) if (z < camZ) this.horns.delete(z);
  }
}
