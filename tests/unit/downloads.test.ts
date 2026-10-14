import { describe, expect, it } from 'vitest';
import { Downloads } from '../../client/src/ui/downloads';

describe('required asset downloads', () => {
  it('counts actual streamed bytes and retries only failures', async () => {
    const calls: string[] = []; let fail = true;
    const downloads = new Downloads((async (url: string) => {
      calls.push(url);
      if (url === '/bad' && fail) return new Response('', { status: 503 });
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new Uint8Array(2)); controller.enqueue(new Uint8Array(3)); controller.close();
      } }));
    }) as typeof fetch);
    downloads.register('/good', 5); downloads.register('/bad', 5);
    const progress: number[] = []; downloads.onProgress = loaded => progress.push(loaded);
    await expect(downloads.load()).rejects.toThrow('503');
    expect(downloads.total).toBe(10); expect(progress).toContain(2);
    fail = false; await downloads.load();
    expect(calls).toEqual(['/good', '/bad', '/bad']);
    expect(progress.at(-1)).toBe(10); expect(downloads.bytes('/good').byteLength).toBe(5);
  });
  it('never accepts truncated data as a completed asset', async () => {
    const downloads = new Downloads((async () => new Response(new Uint8Array(2))) as typeof fetch);
    downloads.register('/cut', 5);
    await expect(downloads.load()).rejects.toThrow('Incomplete');
    expect(() => downloads.bytes('/cut')).toThrow('not downloaded');
  });
});
