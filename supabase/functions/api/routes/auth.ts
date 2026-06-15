import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { signToken } from '../lib/jwt.ts';
import { serviceClient } from '../lib/supabase.ts';

export interface UserRecord {
  id: string;
  username: string;
  display_name: string | null;
  password_hash: string;
  is_active: boolean;
}

export type FindUser = (username: string) => Promise<UserRecord | null>;

const defaultFindUser: FindUser = async (username) => {
  const { data } = await serviceClient()
    .from('users')
    .select('id, username, display_name, password_hash, is_active')
    .eq('username', username)
    .maybeSingle();
  return (data as UserRecord | null) ?? null;
};

export function buildAuthRoutes(findUser: FindUser = defaultFindUser) {
  const app = new Hono();

  app.post('/login', async (c) => {
    const { username, password } = await c.req.json().catch(() => ({}));
    if (!username || !password) {
      return c.json({ error: 'Username and password are required.' }, 400);
    }

    const user = await findUser(String(username).trim().toLowerCase());
    if (!user || !user.is_active) {
      return c.json({ error: 'Invalid credentials.' }, 401);
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return c.json({ error: 'Invalid credentials.' }, 401);

    const secret = Deno.env.get('SESSION_SECRET');
    if (!secret) return c.json({ error: 'Server misconfigured' }, 500);

    const token = await signToken(
      { userId: user.id, username: user.username, displayName: user.display_name },
      secret
    );
    return c.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  });

  return app;
}
