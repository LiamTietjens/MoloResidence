import { Hono } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../lib/supabase.ts';

type ClientFactory = () => SupabaseClient;

export function buildCallRoutes(makeClient: ClientFactory = serviceClient) {
  const app = new Hono();

  // Ported from src/app/(dashboard)/calls/page.tsx:
  //   supabase.from('call_logs').select('*').order('started_at', { ascending: false })
  app.get('/', async (c) => {
    const { data, error } = await makeClient()
      .from('call_logs').select('*').order('started_at', { ascending: false });
    if (error) {
      console.error('GET /calls failed:', error);
      return c.json({ error: 'Request failed.' }, 400);
    }
    return c.json(data ?? []);
  });

  // Ported from src/app/(dashboard)/calls/detail/page.tsx. The call row carries
  // transcript / recording / tool-trace via select('*'); the page then fetches
  // the property name, cost rates, and linked tickets/bookings in parallel.
  app.get('/:id', async (c) => {
    const sb = makeClient();
    const id = c.req.param('id');

    const { data: call } = await sb
      .from('call_logs').select('*').eq('id', id).single();
    if (!call) return c.json({ error: 'Not found.' }, 404);

    const [
      { data: propData },
      { data: settingsData },
      { data: ticketData },
      { data: bookingData },
    ] = await Promise.all([
      call.property_id
        ? sb.from('properties').select('name').eq('id', call.property_id).single()
        : Promise.resolve({ data: null }),
      sb.from('agent_settings').select('cost_per_min_usd').limit(1).maybeSingle(),
      sb.from('maintenance_tickets')
        .select('id, room_number, status, urgency').eq('call_id', id),
      sb.from('booking_links')
        .select('id, guest_name, converted').eq('call_id', id),
    ]);

    const propertyName = (propData as { name: string } | null)?.name ?? null;
    const rates = (settingsData as { cost_per_min_usd: unknown } | null)?.cost_per_min_usd;
    const costRates = rates && typeof rates === 'object' ? rates : null;

    return c.json({
      call,
      propertyName,
      costRates,
      tickets: ticketData ?? [],
      bookings: bookingData ?? [],
    });
  });

  // Delete a call's transcript, keeping the call itself.
  //
  // Despite the column name, `summary` IS the transcript — the agent writes the
  // raw turn-by-turn "role: text" lines there (see agent_pipeline.py). Nothing
  // writes `transcript_url`, so clearing `summary` clears the only copy the
  // dashboard holds.
  //
  // Deliberately NOT deleting the call_logs row: started_at / duration /
  // from_number / outcome drive the metrics on the dashboard home, and losing
  // them would silently change historical numbers. This exists for
  // data-deletion requests, where the conversation is the sensitive part.
  app.delete('/:id/transcript', async (c) => {
    const id = c.req.param('id');
    const sb = makeClient();

    // 404 rather than a silent no-op, so the UI can tell "already gone" from
    // "wrong id".
    const { data: existing } = await sb
      .from('call_logs').select('id').eq('id', id).maybeSingle();
    if (!existing) return c.json({ error: 'Not found.' }, 404);

    const { error } = await sb
      .from('call_logs').update({ summary: null }).eq('id', id);
    if (error) {
      console.error('DELETE /calls/:id/transcript failed:', error);
      return c.json({ error: 'Request failed.' }, 400);
    }
    return c.json({ ok: true });
  });

  return app;
}
