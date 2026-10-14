import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ART } from '../shared/config.ts';

// Geometric edge audit: weld coincident vertices and split voxel T-junctions.
// Every directed boundary segment must have exactly cancelling opposite edges.
const key = p => p.map(n => Math.round(n * 100000)).join(',');
const records = [];
for (const file of (await readdir('client/public/models')).filter(n => n.endsWith('.glb'))) {
  const bytes = await readFile(`client/public/models/${file}`);
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const record = { file, bytes: bytes.length, meshes: 0, boundarySegments: 0, flatMeshes: 0, issues: [] };
  scene.traverse(mesh => {
    if (!(mesh instanceof Mesh)) return;
    record.meshes++;
    const p = mesh.geometry.attributes.position, indices = mesh.geometry.index;
    const points = Array.from({ length: p.count }, (_, i) => [p.getX(i), p.getY(i), p.getZ(i)]);
    const lines = [new Map(), new Map(), new Map()];
    for (const point of points) for (let axis = 0; axis < 3; axis++) {
      const lineKey = key(point.filter((_, i) => i !== axis));
      if (!lines[axis].has(lineKey)) lines[axis].set(lineKey, new Set());
      lines[axis].get(lineKey).add(Math.round(point[axis] * 100000));
    }
    const edges = new Map(); let volume = 0;
    const segment = (a, b) => {
      const ka = key(a), kb = key(b); if (ka === kb) return;
      const edgeKey = ka < kb ? `${ka}/${kb}` : `${kb}/${ka}`;
      edges.set(edgeKey, (edges.get(edgeKey) ?? 0) + (ka < kb ? 1 : -1));
    };
    const edge = (a, b) => {
      const axes = [0, 1, 2].filter(i => Math.abs(a[i] - b[i]) > 0.000001);
      if (axes.length !== 1) {
        const delta = b.map((v, i) => v - a[i]);
        const length2 = delta.reduce((n, v) => n + v * v, 0);
        if (length2 < 1e-14) return;
        const cuts = new Map([[0, a], [1, b]]);
        for (const point of points) {
          const t = point.reduce((n, v, i) => n + (v - a[i]) * delta[i], 0) / length2;
          if (t <= 0.000001 || t >= 0.999999) continue;
          if (point.every((v, i) => Math.abs(v - a[i] - t * delta[i]) < 0.000002)) cuts.set(t, point);
        }
        const sorted = [...cuts].sort((x, y) => x[0] - y[0]);
        for (let i = 1; i < sorted.length; i++) segment(sorted[i - 1][1], sorted[i][1]);
        return;
      }
      const axis = axes[0], values = lines[axis].get(key(a.filter((_, i) => i !== axis)));
      const lo = Math.round(Math.min(a[axis], b[axis]) * 100000), hi = Math.round(Math.max(a[axis], b[axis]) * 100000);
      const cuts = [...values].filter(v => v >= lo && v <= hi).sort((x, y) => a[axis] < b[axis] ? x - y : y - x);
      for (let i = 1; i < cuts.length; i++) { const x = [...a], y = [...a]; x[axis] = cuts[i - 1] / 100000; y[axis] = cuts[i] / 100000; segment(x, y); }
    };
    const count = indices?.count ?? p.count;
    for (let i = 0; i < count; i += 3) {
      const [a, b, c] = [0, 1, 2].map(j => points[indices ? indices.getX(i + j) : i + j]);
      edge(a, b); edge(b, c); edge(c, a);
      volume += a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
    const open = [...edges].filter(([, n]) => n !== 0);
    record.boundarySegments += open.length;
    if (open.length) record.issues.push({ mesh: mesh.name, edges: open.slice(0, 40) });
    if (Math.abs(volume) < 0.0000001) record.flatMeshes++;
  });
  records.push(record);
}
const totalBytes = records.reduce((n, r) => n + r.bytes, 0);
const report = { totalBytes, limit: ART.TOTAL_GLB_BUDGET, models: records, pass: totalBytes < ART.TOTAL_GLB_BUDGET && records.every(r => r.boundarySegments === 0 && r.flatMeshes === 0) };
await mkdir('art/review', { recursive: true });
await writeFile('art/review/geometry-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
