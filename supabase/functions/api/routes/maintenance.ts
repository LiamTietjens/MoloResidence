import { Hono } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../lib/supabase.ts';

type ClientFactory = () => SupabaseClient;

export function buildMaintenanceRoutes(makeClient: ClientFactory = serviceClient) {
  const app = new Hono();

  // Ported from src/app/(dashboard)/maintenance/page.tsx:
  //   supabase.from('maintenance_tickets').select('*')
  app.get('/', async (c) => {
    const { data, error } = await makeClient()
      .from('maintenance_tickets').select('*');
    if (error) {
      console.error('GET /maintenance failed:', error);
      return c.json({ error: 'Request failed.' }, 400);
    }
    return c.json(data ?? []);
  });

  // Ported from src/app/(dashboard)/maintenance/detail/page.tsx:
  //   supabase.from('maintenance_tickets').select('*').eq('id', id).single()
  app.get('/:id', async (c) => {
    const { data, error } = await makeClient()
      .from('maintenance_tickets').select('*').eq('id', c.req.param('id')).single();
    if (error || !data) {
      return c.json({ error: 'Not found.' }, 404);
    }
    return c.json(data);
  });

  // Ported from src/backend/maintenance.ts updateTicket():
  //   supabase.from('maintenance_tickets').update(patch).eq('id', id)
  app.patch('/:id', async (c) => {
    const patch = await c.req.json().catch(() => null);
    if (!patch) return c.json({ error: 'Invalid JSON body.' }, 400);
    const { error } = await makeClient()
      .from('maintenance_tickets').update(patch).eq('id', c.req.param('id'));
    if (error) {
      console.error('PATCH /maintenance/:id update failed:', error);
      return c.json({ error: 'Request failed.' }, 400);
    }
    return c.json({ ok: true });
  });

  return app;
}
