'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMetrics } from '@/lib/metrics-api';
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

type CallLog = Tables<'call_logs'>;
type Ticket = Tables<'maintenance_tickets'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Overview of your Molo Residence operations.
            </p>
          </div>
          <RefreshButton
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['metrics'] })
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading metrics…</p>
      </div>
    );
  }

  const recentCalls = data.recentCalls as CallLog[];
  const topTickets = data.topTickets as Ticket[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your Molo Residence operations.
          </p>
        </div>
        <RefreshButton
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ['metrics'] })
          }
        />
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
            {recentCalls.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No calls yet.
              </p>
            ) : (
              <div className="divide-y">
                {recentCalls.map((call) => (
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
            {topTickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No critical or high-urgency tickets open.
              </p>
            ) : (
              <div className="divide-y">
                {topTickets.map((ticket) => (
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
