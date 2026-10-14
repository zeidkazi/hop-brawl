/** The build supplies decoded asset sizes, so compressed HTTP responses need no HEAD requests. */
declare const __ASSET_BYTES__: Record<string, number>;
type Entry = { url: string; size: number; loaded: number; data?: ArrayBuffer };
export class Downloads {
  readonly entries = new Map<string, Entry>();
  onProgress: ((loaded: number, total: number) => void) | null = null;
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  register(url: string, size: number): void {
    if (!this.entries.has(url)) this.entries.set(url, { url, size, loaded: 0 });
  }
  get total(): number { let total = 0; for (const entry of this.entries.values()) total += entry.size; return total; }
  private report(): void {
    let loaded = 0; for (const entry of this.entries.values()) loaded += entry.loaded;
    this.onProgress?.(loaded, this.total);
  }
  async load(): Promise<void> {
    const results = await Promise.allSettled([...this.entries.values()].filter(entry => !entry.data).map(async entry => {
      entry.loaded = 0;
      const response = await this.fetcher(entry.url);
      if (!response.ok) throw new Error(`Asset ${response.status}: ${entry.url}`);
      const reader = response.body?.getReader();
      if (!reader) {
        entry.data = await response.arrayBuffer(); entry.loaded = entry.data.byteLength; this.report(); return;
      }
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        chunks.push(value); entry.loaded += value.byteLength; this.report();
      }
      if (entry.loaded !== entry.size) throw new Error(`Incomplete asset: ${entry.url}`);
      const bytes = new Uint8Array(entry.loaded); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      entry.data = bytes.buffer; this.report();
    }));
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
  bytes(url: string): ArrayBuffer {
    const data = this.entries.get(url)?.data;
    if (!data) throw new Error(`Asset not downloaded: ${url}`);
    return data;
  }
}
export const downloads = new Downloads();
export function registerAsset(url: string, filename: string): void {
  const size = __ASSET_BYTES__[filename];
  if (!size) throw new Error(`Missing asset size: ${filename}`);
  downloads.register(url, size);
}
