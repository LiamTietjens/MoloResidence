import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));

Deno.serve(app.fetch);

export default app;
