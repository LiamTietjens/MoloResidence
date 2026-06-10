import Link from 'next/link';
import { createServerClient } from '@/backend/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  PhoneIcon,
  WrenchIcon,
  LinkIcon,
  Building2,
} from 'lucide-react';
import type { Tables } from '@/backend/types';
import { RefreshButton } from './refresh-button';

export const dynamic = 'force-dynamic';

type CallLog = Tables<'call_logs'>;
type Ticket = Tables<'maintenance_tickets'>;

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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const supabase = createServerClient();

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
    // Today's calls — need rows to sum duration + cost.
    supabase
      .from('call_logs')
      .select('duration_seconds, cost_usd')
      .gte('started_at', todayIso),
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .eq('urgency', 'critical'),
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .eq('urgency', 'high'),
    // Booking links in last 7d — need rows for CTR / conversion.
    supabase
      .from('booking_links')
      .select('clicked_at, converted')
      .gte('sent_at', sevenDaysAgoIso),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('call_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10),
    supabase
      .from('maintenance_tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .in('urgency', ['critical', 'high'])
      .order('created_at', { ascending: false }),
  ]);

  const callsTodayRows = callsTodayRes.data ?? [];
  const durationTodaySeconds = callsTodayRows.reduce(
    (sum, c) => sum + (c.duration_seconds ?? 0),
    0
  );
  const costTodayUsd = callsTodayRows.reduce(
    (sum, c) => sum + (c.cost_usd ?? 0),
    0
  );

  const bookings = bookingsRes.data ?? [];
  const clicked = bookings.filter((b) => b.clicked_at !== null).length;
  const convertedCount = bookings.filter((b) => b.converted).length;

  // Order critical/high tickets by urgency, then most recent.
  const topTickets: Ticket[] = (topTicketsRes.data ?? [])
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
    recentCalls: (recentCallsRes.data ?? []) as CallLog[],
    topTickets,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your Molo Residence operations.
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Calls today"
          icon={<PhoneIcon className="size-4 text-muted-foreground" />}
          value={data.callsToday}
          subtitle={`${Math.round(data.durationTodaySeconds / 60)}m · $${data.costTodayUsd.toFixed(2)}`}
        />
        <MetricCard
          title="Open maintenance"
          icon={<WrenchIcon className="size-4 text-muted-foreground" />}
          value={data.openTickets}
          subtitle={`${data.criticalTickets} critical · ${data.highTickets} high`}
        />
        <MetricCard
          title="Booking links (7d)"
          icon={<LinkIcon className="size-4 text-muted-foreground" />}
          value={data.bookingLinks7d}
          subtitle={`CTR ${data.bookingCtr} · Conv ${data.bookingConv}`}
        />
        <MetricCard
          title="Active properties"
          icon={<Building2 className="size-4 text-muted-foreground" />}
          value={data.activeProperties}
        />
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>The 10 most recent calls.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentCalls.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No calls yet.
              </p>
            ) : (
              <div className="divide-y">
                {data.recentCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/calls/detail?id=${call.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <RelativeTime
                      date={call.started_at}
                      className="text-muted-foreground shrink-0 w-24"
                    />
                    <span className="font-mono text-xs text-muted-foreground shrink-0 w-12 text-right">
                      {call.duration_seconds != null
                        ? formatDuration(call.duration_seconds)
                        : '—'}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      <StatusBadge kind="mode" value={call.mode} />
                      <StatusBadge kind="outcome" value={call.outcome} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open critical/high tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Open critical / high tickets</CardTitle>
            <CardDescription>
              Top 5 by urgency, then most recent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topTickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No critical or high-urgency tickets open.
              </p>
            ) : (
              <div className="divide-y">
                {data.topTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/maintenance/detail?id=${ticket.id}`}
                    className="flex items-center gap-3 py-2 text-sm transition-colors hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <StatusBadge
                      kind="urgency"
                      value={ticket.urgency}
                      className="shrink-0"
                    />
                    <span className="font-medium shrink-0">
                      Room {ticket.room_number}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {ticket.description}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  icon,
  value,
  subtitle,
}: {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
