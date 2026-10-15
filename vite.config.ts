import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COLORS, LOADING } from './shared/config';

const assetBytes: Record<string, number> = {};
for (const directory of ['client/public/sfx', 'client/public/music', 'client/public/models', 'node_modules/@fontsource/lilita-one/files', 'node_modules/@fontsource/nunito/files']) {
  for (const name of readdirSync(directory)) if (/\.(glb|mp3|ogg|m4a)$|latin-(400|700|800)-normal\.woff2$/.test(name)) assetBytes[name] = statSync(join(directory, name)).size;
}

export default defineConfig({
  root: fileURLToPath(new URL('./client', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  define: { __ASSET_BYTES__: JSON.stringify(assetBytes) },
  plugins: [{ name: 'inline-loading-config', transformIndexHtml(html) {
    const values: Record<string, string | number> = { SKY_TOP: COLORS.skyTop, SKY_BOTTOM: COLORS.sky,
      FAST: LOADING.FAST_MS, TAP: LOADING.TAP_MS, SLOW: LOADING.SLOW_MS };
    const result = html.replace(/__(SKY_TOP|SKY_BOTTOM|FAST|TAP|SLOW)__/g, (_, key: string) => String(values[key]));
    if (Buffer.byteLength(result) >= LOADING.INLINE_BUDGET) throw new Error('Inline loading HTML exceeds 15 KB');
    return result;
  } }],
  server: { host: '0.0.0.0', port: 5173, strictPort: true, proxy: {
    '/api': { target: 'http://127.0.0.1:8787' },
    '/ws': { target: 'http://127.0.0.1:8787', ws: true },
  } },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', target: ['es2022', 'safari16'] },
});
