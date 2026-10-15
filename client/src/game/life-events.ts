/** Prediction and confirmation share one animation; only confirmation may produce a toast. */
export class LifeEvents {
  private readonly animated = new Map<string, number>();
  private readonly confirmed = new Map<string, number>();
  animation(id: string, lifeId: number): boolean { return this.once(this.animated, id, lifeId); }
  confirmation(id: string, lifeId: number): boolean { return this.once(this.confirmed, id, lifeId); }
  clear(): void { this.animated.clear(); this.confirmed.clear(); }
  private once(map: Map<string, number>, id: string, life: number): boolean {
    if ((map.get(id) ?? -1) >= life) return false;
    map.set(id, life); return true;
  }
}
