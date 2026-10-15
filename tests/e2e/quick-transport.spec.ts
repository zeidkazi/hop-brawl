import { expect, test } from '@playwright/test';

test('matchmaker sockets cancel, pair FIFO, reject code joins and recover a connection timeout', async ({ page }) => {
  test.setTimeout(60000);
  page.on('console', message => console.log(message.text()));
  await page.goto('/licenses/lilita-one.txt');
  const result = await page.evaluate(async () => {
    type Message = { type: string; code?: string; token?: string; count?: number; error?: string; snapshot?: { quick: boolean; phase: string; host: string } };
    const sockets: WebSocket[] = [];
    const connect = (path: string) => {
      const url = new URL(path, location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url), messages: Message[] = []; sockets.push(ws);
      ws.onmessage = e => { if (e.data !== 'pong') { const message = JSON.parse(String(e.data)) as Message; messages.push(message); if (message.type !== 'state') console.log(path.split('?')[0], message.type, message.error ?? '', message.count ?? ''); } };
      return { ws, messages };
    };
    const wait = async (check: () => Message | undefined) => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) { const value = check(); if (value) return value; await new Promise(r => setTimeout(r, 25)); }
      throw new Error('Timed out waiting for socket state');
    };
    try {
      const canceled = connect('/ws/quick?name=Cancel&animal=0');
      await wait(() => canceled.messages.find(m => m.type === 'searching'));
      canceled.ws.send('cancel'); await new Promise(r => setTimeout(r, 100));
      const a = connect('/ws/quick?name=First&animal=2');
      const count = await wait(() => a.messages.find(m => m.type === 'searching'));
      const b = connect('/ws/quick?name=Missing&animal=3');
      const matchedA = await wait(() => a.messages.find(m => m.type === 'matched'));
      const matchedB = await wait(() => b.messages.find(m => m.type === 'matched'));
      const intruder = connect(`/ws/room/${matchedA.code}?name=Intruder&animal=1&aspect=1`);
      const denied = await wait(() => intruder.messages.find(m => m.type === 'error'));
      const roomA = connect(`/ws/room/${matchedA.code}?name=First&animal=2&aspect=1&token=${matchedA.token}`);
      await wait(() => roomA.messages.find(m => m.type === 'welcome'));
      const retry = await wait(() => a.messages.find(m => m.type === 'retry'));
      const c = connect('/ws/quick?name=Next&animal=4');
      const nextA = await wait(() => a.messages.filter(m => m.type === 'matched')[1]);
      const nextC = await wait(() => c.messages.find(m => m.type === 'matched'));
      const joinedA = connect(`/ws/room/${nextA.code}?name=First&animal=2&aspect=1&token=${nextA.token}`);
      const joinedC = connect(`/ws/room/${nextC.code}?name=Next&animal=4&aspect=1&token=${nextC.token}`);
      const started = await wait(() => joinedA.messages.find(m => m.snapshot?.phase === 'playing'));
      await wait(() => joinedC.messages.find(m => m.snapshot?.phase === 'playing'));
      await wait(() => a.messages.find(m => m.type === 'ready'));
      return { count: count.count, same: matchedA.code === matchedB.code, denied: denied.error, retried: retry.type,
        next: nextA.code === nextC.code && nextA.code !== matchedA.code, quick: started.snapshot?.quick, host: started.snapshot?.host };
    } finally { sockets.forEach(ws => ws.close()); }
  });
  expect(result).toEqual({ count: 1, same: true, denied: 'ROOM_NOT_FOUND', retried: 'retry', next: true, quick: true, host: '' });
});

test('late in-time arrival finishes countdown; a countdown disconnect requeues the survivor', async ({ page }) => {
  test.setTimeout(40000);
  await page.goto('/licenses/lilita-one.txt');
  const result = await page.evaluate(async () => {
    type Message = { type: string; code: string; token: string; snapshot?: { phase: string } };
    const all: WebSocket[] = [];
    const connect = (path: string) => {
      const url = new URL(path, location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url), messages: Message[] = []; all.push(ws);
      ws.onmessage = e => { if (e.data !== 'pong') messages.push(JSON.parse(String(e.data)) as Message); };
      return { ws, messages };
    };
    const wait = async (check: () => Message | undefined) => {
      const until = Date.now() + 15000;
      while (Date.now() < until) { const result = check(); if (result) return result; await new Promise(r => setTimeout(r, 20)); }
      throw new Error('No matchmaking response');
    };
    const join = (m: Message) => connect(`/ws/room/${m.code}?token=${m.token}&aspect=1`);
    try {
      const a = connect('/ws/quick?name=LateA&animal=2'), b = connect('/ws/quick?name=LateB&animal=2');
      const ma = await wait(() => a.messages.find(m => m.type === 'matched')), mb = await wait(() => b.messages.find(m => m.type === 'matched'));
      const ra = join(ma); await wait(() => ra.messages.find(m => m.type === 'welcome'));
      await new Promise(r => setTimeout(r, 8500)); const rb = join(mb);
      await wait(() => rb.messages.find(m => m.snapshot?.phase === 'playing'));
      await wait(() => a.messages.find(m => m.type === 'ready'));
      a.ws.close(); b.ws.close(); ra.ws.close(); rb.ws.close();
      const c = connect('/ws/quick?name=AbortA&animal=2'), d = connect('/ws/quick?name=AbortB&animal=4');
      const mc = await wait(() => c.messages.find(m => m.type === 'matched')), md = await wait(() => d.messages.find(m => m.type === 'matched'));
      const rc = join(mc), rd = join(md); await wait(() => rc.messages.find(m => m.snapshot?.phase === 'countdown'));
      rd.ws.close(); d.ws.close(); await wait(() => c.messages.find(m => m.type === 'retry'));
      return { lateStarted: true, countdownRetried: true };
    } finally { all.forEach(ws => ws.close()); }
  });
  expect(result).toEqual({ lateStarted: true, countdownRetried: true });
});
