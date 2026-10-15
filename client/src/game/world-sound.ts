import { CONFIG, SOUND, STREET } from '../../../shared/config';
import { laneItemX } from '../../../shared/hazards';
import type { Row } from '../../../shared/types';
import type { BoxingSound } from './audio';
import { spatial } from './audio-policy';
import { RailSound } from './rail-sound';
export class WorldSound {
  private next = -Infinity; private readonly rail = new RailSound(); private readonly honks = new Set<string>();
  reset(): void { this.next = -Infinity; this.rail.reset(); this.honks.clear(); }
  update(rows: readonly { z: number; row: Row | null }[], camZ: number, time: number, sound: BoxingSound, x: number, z: number, alive = true): void {
    if (time < this.next) return; this.next = time + SOUND.WORLD_INTERVAL_S;
    sound.beginWorld(); this.rail.update(rows, camZ, time, sound, x, z);
    const water = rows.find(s => s.row?.kind === 'river' && s.z >= camZ && s.z <= camZ + CONFIG.VIEW_ROWS);
    if (water) sound.loop('water', 'water', 0, SOUND.AMBIENCE_GAIN);
    const biome = rows.find(s => s.z === Math.round(z))?.row?.biome ?? 'meadow';
    sound.biome(biome);
    if (biome === 'meadow') sound.loop('birds', 'birds', 0, SOUND.AMBIENCE_GAIN);
    for (const side of STREET.ARENA_SIDE_X) {
      const position = spatial(side, z, x, z, CONFIG.VIEW_ROWS);
      sound.loop(`crowd-${side}`, 'crowd', position.pan, SOUND.AMBIENCE_GAIN / (1 + Math.abs(side - x) / SOUND.PAN_TILES));
    }
    for (const slot of rows) {
      if (slot.row?.kind !== 'road' || Math.abs(slot.z - z) >= SOUND.AUDIBLE_ROWS) continue;
      for (let i = 0; i < slot.row.vehicles.length; i++) {
        const car = slot.row.vehicles[i]!, at = laneItemX(slot.row, car, time), key = `${slot.z}-${i}`;
        const position = spatial(at, slot.z, x, z);
        sound.loop(`car-${key}`, car.kind === 'truck' ? 'truck' : 'car', position.pan, position.level * SOUND.CAR_GAIN);
        const gap = Math.hypot(Math.max(0, Math.abs(at - x) - car.length / 2 - CONFIG.PLAYER_HITBOX / 2), Math.max(0, Math.abs(slot.z - z) - .5 - CONFIG.PLAYER_HITBOX / 2));
        if (alive && gap > 0 && gap <= SOUND.NEAR_MISS_TILES && !this.honks.has(key)) { sound.play('honk', position.pan, SOUND.HAZARD_GAIN); this.honks.add(key); }
        if (Math.abs(at - x) > car.length + 1) this.honks.delete(key);
      }
    }
    for (const key of this.honks) if (Number(key.split('-')[0]) < camZ - 1) this.honks.delete(key);
    sound.endWorld();
  }
}
