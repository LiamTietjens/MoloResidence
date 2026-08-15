import { Hono } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../lib/supabase.ts';

type ClientFactory = () => SupabaseClient;

const DAY_MS = 24 * 60 * 60 * 1000;
const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function pct(n: number, d: number): string {
  if (d === 0) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

interface Ticket {
  id: string;
  urgency: string;
  created_at: string;
  [k: string]: unknown;
}

// Ported 1:1 from src/app/(dashboard)/page.tsx — the dashboard-home aggregates.
// Returns one JSON object with exactly the fields that page builds in `data`.
export function buildMetricsRoutes(makeClient: ClientFactory = serviceClient) {
  const app = new Hono();

  app.get('/', async (c) => {
    const sb = makeClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const sevenDaysAgoIso = new Date(Date.now() - 7 * DAY_MS).toISOString();

    const [
      callsTodayRes,
      openTicketsRes,
      criticalRes,
      highRes,
      bookingsRes,
      propertiesRes,
      recentCallsRes,
      topTicketsRes,
    ] = await Promise.all([
      sb.from('call_logs')
        .select('duration_seconds, cost_usd')
        .gte('started_at', todayIso),
      sb.from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      sb.from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('urgency', 'critical'),
      sb.from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('urgency', 'high'),
      sb.from('booking_links')
        .select('clicked_at, converted')
        .gte('sent_at', sevenDaysAgoIso),
      sb.from('properties')
        .select('id', { count: 'exact', head: true }),
      sb.from('call_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10),
      sb.from('maintenance_tickets')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .in('urgency', ['critical', 'high'])
        .order('created_at', { ascending: false }),
    ]);

    const callsTodayRows = (callsTodayRes.data ?? []) as Array<{ duration_seconds: number | null; cost_usd: number | null }>;
    const durationTodaySeconds = callsTodayRows.reduce(
      (sum, c2) => sum + (c2.duration_seconds ?? 0),
      0
    );
    const costTodayUsd = callsTodayRows.reduce(
      (sum, c2) => sum + (c2.cost_usd ?? 0),
      0
    );

    const bookings = (bookingsRes.data ?? []) as Array<{ clicked_at: string | null; converted: boolean }>;
    const clicked = bookings.filter((b) => b.clicked_at !== null).length;
    const convertedCount = bookings.filter((b) => b.converted).length;

    const topTickets: Ticket[] = ((topTicketsRes.data ?? []) as Ticket[])
      .slice()
      .sort((a, b) => {
        const u =
          (URGENCY_ORDER[a.urgency] ?? 99) - (URGENCY_ORDER[b.urgency] ?? 99);
        if (u !== 0) return u;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);

    const data = {
      callsToday: callsTodayRows.length,
      durationTodaySeconds,
      costTodayUsd,
      openTickets: openTicketsRes.count ?? 0,
      criticalTickets: criticalRes.count ?? 0,
      highTickets: highRes.count ?? 0,
      bookingLinks7d: bookings.length,
      bookingCtr: pct(clicked, bookings.length),
      bookingConv: pct(convertedCount, bookings.length),
      activeProperties: propertiesRes.count ?? 0,
      recentCalls: recentCallsRes.data ?? [],
      topTickets,
    };

    return c.json(data);
  });

  return app;
}
