import { ROOM } from '../shared/config';
export { Room } from './room';
export { Matchmaker } from './matchmaker';
export interface Env { MATCHMAKER: DurableObjectNamespace; ROOMS: DurableObjectNamespace; ASSETS: Fetcher; ALLOWED_ORIGINS?: string }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/ws/')) return env.ASSETS.fetch(request);
    const origin = request.headers.get('Origin');
    const allowed = new Set([url.origin, ...(env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)]);
    if (origin && !allowed.has(origin)) return Response.json({ error: 'ORIGIN_NOT_ALLOWED' }, { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { headers: {
      'Access-Control-Allow-Origin': origin ?? url.origin, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin',
    } });
    const json = (data: unknown, status = 200) => Response.json(data, { status, headers: {
      'Access-Control-Allow-Origin': origin ?? url.origin, Vary: 'Origin', 'Cache-Control': 'no-store',
    } });
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < ROOM.CREATE_ATTEMPTS; attempt++) {
        const bytes = crypto.getRandomValues(new Uint32Array(ROOM.CODE_LENGTH));
        const code = [...bytes].map(n => ROOM.CODE_ALPHABET[n % ROOM.CODE_ALPHABET.length]).join('');
        const token = crypto.randomUUID();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const result = await stub.fetch('https://room/create', { method: 'POST', body: JSON.stringify({ code, token }) });
        if (result.ok) return json({ code, token }, 201);
      }
      return json({ error: 'TRY_AGAIN' }, 503);
    }
    if (url.pathname === '/ws/quick' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return env.MATCHMAKER.get(env.MATCHMAKER.idFromName('global')).fetch(request);
    }
    const match = /^\/ws\/room\/([A-Z]{4})$/.exec(url.pathname);
    if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return env.ROOMS.get(env.ROOMS.idFromName(match[1]!)).fetch(request);
    }
    return json({ error: 'ROOM_NOT_FOUND' }, 404);
  },
} satisfies ExportedHandler<Env>;
