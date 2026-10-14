import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ART, VIEW } from '../shared/config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const localEnv = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(localEnv)) process.loadEnvFile(localEnv);
const blender = process.env.BLENDER_PATH;
if (!blender || !existsSync(blender)) {
  throw new Error('Set BLENDER_PATH to the Blender executable in .env.local or the environment. Blender is mandatory; no Node model fallback exists.');
}
const args = process.argv.slice(2);
if (args.includes('--version')) {
  const result = spawnSync(blender, ['--version'], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const configPath = fileURLToPath(new URL('../tmp/art-config.json', import.meta.url));
mkdirSync(fileURLToPath(new URL('../tmp/', import.meta.url)), { recursive: true });
writeFileSync(configPath, JSON.stringify({ ...ART, VOXELS_PER_TILE: VIEW.VOXELS_PER_TILE }));
const script = fileURLToPath(new URL('../art/build_models.py', import.meta.url));
const result = spawnSync(blender, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', script, '--', '--config', configPath, ...args], {
  cwd: root, stdio: 'inherit', windowsHide: true,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
