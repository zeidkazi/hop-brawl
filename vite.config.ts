import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetBytes: Record<string, number> = {};
for (const directory of ['client/public/models', 'node_modules/@fontsource/lilita-one/files', 'node_modules/@fontsource/nunito/files']) {
  for (const name of readdirSync(directory)) if (/\.glb$|latin-(400|700|800)-normal\.woff2$/.test(name)) assetBytes[name] = statSync(join(directory, name)).size;
}

export default defineConfig({
  root: fileURLToPath(new URL('./client', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  define: { __ASSET_BYTES__: JSON.stringify(assetBytes) },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', target: ['es2022', 'safari16'] },
});
