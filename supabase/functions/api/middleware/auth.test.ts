import { assertEquals } from 'jsr:@std/assert@^1.0.0';
import { Hono } from 'hono';
import { requireAuth } from './auth.ts';
import { signToken } from '../lib/jwt.ts';
import type { AppEnv } from '../lib/types.ts';

const SECRET = 'test-secret-at-least-32-chars-long-xx';
Deno.env.set('SESSION_SECRET', SECRET);

function appUnderTest() {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth);
  app.get('/x', (c) => c.json({ user: c.get('user') }));
  return app;
}

Deno.test('requireAuth rejects a missing token with 401', async () => {
  const res = await appUnderTest().request('/x');
  assertEquals(res.status, 401);
});

Deno.test('requireAuth passes a valid token and sets c.get("user")', async () => {
  const token = await signToken({ userId: 'u1', username: 'admin', displayName: 'Admin' }, SECRET);
  const res = await appUnderTest().request('/x', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.user.userId, 'u1');
});
