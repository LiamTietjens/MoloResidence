import { Hono } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../lib/supabase.ts';

type ClientFactory = () => SupabaseClient;

// ⚠️ UNVERIFIED STUB — KWHotel create-reservation. Mirrors the scaffold in
// molo-voice-agent/src/kwhotel.py. The offer/date flow + POST params are NOT
// confirmed and there are no live KWHotel creds yet, so this does NOT actually
// call KWHotel — it returns a not-wired result so nothing is falsely marked
// booked. Phase 2: wire the real POST once the Swagger params are confirmed.
async function createKwhotelReservation(opts: {
  hotelId: string | null;
  roomId: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  currency?: string;
}): Promise<{ ok: boolean; reservationId?: string; error?: string }> {
  const apiKey = Deno.env.get('KWHOTEL_API_KEY');
  if (!apiKey || !opts.hotelId) {
    return { ok: false, error: 'KWHotel not configured.' };
  }
  // TODO(Phase 2): confirm the offer/date flow + POST params from the Swagger, then:
  //   POST {KWHOTEL_API_BASE}/api/integrations/hotels/{hotelId}/reservations
  //   headers { ApiKey }, body { bill, rooms:[{ id, guests:[{ name, isMain, phone, email, ... }]}],
  //   payment:{ paymentAmount:0, currencyCode }, assignToRooms:true }
  return { ok: false, error: 'create-reservation not wired yet (Phase 2).' };
}

// Placeholder options until live KWHotel availability + pricing is wired (Phase 2).
// No photos available from KWHotel — generic descriptions + rates (agreed fallback).
const STUB_OPTIONS = [
  {
    id: 'stub-standard',
    name: 'Standard Apartment',
    description: 'Cozy apartment with everything you need for a comfortable night.',
    price: 250,
    currency: 'PLN',
  },
  {
    id: 'stub-deluxe',
    name: 'Deluxe Apartment',
    description: 'Spacious apartment with extra comfort and a great view.',
    price: 350,
    currency: 'PLN',
  },
];

export function buildPublicBookingRoutes(makeClient: ClientFactory = serviceClient) {
  const app = new Hono();

  // GET /:token — validate the session token and return dates + available options.
  // Public (no JWT): the token itself is the credential.
  app.get('/:token', async (c) => {
    const token = c.req.param('token');
    const { data: s } = await makeClient()
      .from('same_night_bookings')
      .select('token, check_in, check_out, num_adults, num_children, status, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (!s) return c.json({ error: 'not_found' }, 404);
    if (s.expires_at && new Date(s.expires_at as string) < new Date()) {
      return c.json({ error: 'expired' }, 410);
    }
    if (s.status === 'booked') return c.json({ status: 'booked' });
    return c.json({
      status: s.status,
      check_in: s.check_in,
      check_out: s.check_out,
      num_adults: s.num_adults,
      num_children: s.num_children,
      options: STUB_OPTIONS, // TODO(Phase 2): live KWHotel availability + pricing
    });
  });

  // POST /:token/select — { room_id, email } → book the chosen room directly.
  app.post('/:token/select', async (c) => {
    const token = c.req.param('token');
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.room_id !== 'string' || typeof body.email !== 'string' || !body.email.trim()) {
      return c.json({ error: 'room_id and email are required.' }, 400);
    }
    const sb = makeClient();
    const { data: s } = await sb
      .from('same_night_bookings')
      .select('token, hotel_id, phone, check_in, check_out, status, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (!s) return c.json({ error: 'not_found' }, 404);
    if (s.expires_at && new Date(s.expires_at as string) < new Date()) {
      return c.json({ error: 'expired' }, 410);
    }
    if (s.status === 'booked') return c.json({ ok: true, already: true });

    // Record the guest's choice first, so it's never lost even if booking fails.
    await sb.from('same_night_bookings')
      .update({ selected_room_id: body.room_id, guest_email: body.email, status: 'selected' })
      .eq('token', token);

    const res = await createKwhotelReservation({
      hotelId: (s.hotel_id as string) ?? null,
      roomId: body.room_id,
      phone: (s.phone as string) ?? '',
      email: body.email,
      checkIn: s.check_in as string,
      checkOut: s.check_out as string,
    });

    if (!res.ok) {
      // Phase 1: booking not wired yet — selection saved, report pending (not an error).
      console.warn('same-night create-reservation stub:', res.error);
      return c.json({ ok: false, pending: true, error: res.error }, 200);
    }

    await sb.from('same_night_bookings')
      .update({ status: 'booked', kwhotel_reservation_id: res.reservationId ?? null })
      .eq('token', token);
    return c.json({ ok: true, reservation_id: res.reservationId });
  });

  return app;
}
