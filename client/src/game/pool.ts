/** Fixed-capacity storage. Exhaustion is explicit; acquiring never grows the pool. */
export class Pool<T> {
  readonly items: readonly T[];
  private readonly free: Int32Array;
  private readonly used: Uint8Array;
  private available: number;

  constructor(capacity: number, create: (index: number) => T) {
    this.items = Array.from({ length: capacity }, (_, index) => create(index));
    this.free = new Int32Array(capacity);
    this.used = new Uint8Array(capacity);
    this.available = capacity;
    for (let i = 0; i < capacity; i++) this.free[i] = capacity - i - 1;
  }

  acquire(): number {
    if (!this.available) return -1;
    const index = this.free[--this.available]!;
    this.used[index] = 1;
    return index;
  }

  release(index: number): void {
    if (!this.used[index]) return;
    this.used[index] = 0;
    this.free[this.available++] = index;
  }

  active(index: number): boolean { return this.used[index] === 1; }
  get count(): number { return this.items.length - this.available; }
}
