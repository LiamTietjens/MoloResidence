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

  return app;
}
