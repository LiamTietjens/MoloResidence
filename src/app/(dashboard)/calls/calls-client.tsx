'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Tables } from '@/backend/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { CopyButton } from '@/components/shared/copy-button';
import { PhoneCall } from 'lucide-react';

type CallLog = Tables<'call_logs'>;
type Property = Pick<Tables<'properties'>, 'id' | 'name'>;

const ALL = '__all__';

const MODE_OPTIONS = ['booking', 'guest', 'mixed', 'unknown'];
const OUTCOME_OPTIONS = [
  'booking_link_sent',
  'reservation_info_provided',
  'maintenance_ticket_raised',
  'troubleshoot_resolved',
  'transferred_to_human',
  'unresolved',
  'abandoned',
  'spam',
  'other',
];

/** Format a duration in seconds as "m:ss". Returns an em dash for null. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function humanize(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function CallsList({
  calls,
  properties,
}: {
  calls: CallLog[];
  properties: Property[];
}) {
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [mode, setMode] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<string>(ALL);
  const [propertyId, setPropertyId] = useState<string>(ALL);

  const propertyName = useMemo(() => {
    const map = new Map(properties.map((p) => [p.id, p.name]));
    return (id: string | null | undefined): string | null => {
      if (!id) return null;
      return map.get(id) ?? null;
    };
  }, [properties]);

  const filtered = useMemo(() => {
    const fromTime = fromDate ? new Date(fromDate).getTime() : null;
    let toTime: number | null = null;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      toTime = end.getTime();
    }

    return calls.filter((call) => {
      const started = new Date(call.started_at).getTime();
      if (fromTime != null && started < fromTime) return false;
      if (toTime != null && started > toTime) return false;
      if (mode !== ALL && call.mode !== mode) return false;
      if (outcome !== ALL && call.outcome !== outcome) return false;
      if (propertyId !== ALL && call.property_id !== propertyId) return false;
      return true;
    });
  }, [calls, fromDate, toDate, mode, outcome, propertyId]);

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setMode(ALL);
    setOutcome(ALL);
    setPropertyId(ALL);
  }

  const hasFilters =
    !!fromDate || !!toDate || mode !== ALL || outcome !== ALL || propertyId !== ALL;

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mode</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode((v as string) ?? ALL)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modes</SelectItem>
              {MODE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {humanize(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Outcome</Label>
          <Select
            value={outcome}
            onValueChange={(v) => setOutcome((v as string) ?? ALL)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All outcomes</SelectItem>
              {OUTCOME_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {humanize(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Property</Label>
          <Select
            value={propertyId}
            onValueChange={(v) => setPropertyId((v as string) ?? ALL)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <PhoneCall className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="text-muted-foreground">
            {hasFilters
              ? 'No calls match the current filters.'
              : 'No calls logged yet. Calls appear here once the voice agent starts handling them.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((call) => (
                <TableRow key={call.id} className="group">
                  <TableCell>
                    <Link
                      href={`/calls/detail?id=${call.id}`}
                      className="block hover:underline"
                    >
                      <RelativeTime date={call.started_at} />
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(call.duration_seconds)}
                  </TableCell>
                  <TableCell>
                    {call.from_number ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                        {call.from_number}
                        <CopyButton text={call.from_number} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="mode" value={call.mode} />
                  </TableCell>
                  <TableCell>
                    {propertyName(call.property_id) ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="outcome" value={call.outcome} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {call.cost_usd != null ? (
                      `$${Number(call.cost_usd).toFixed(4)}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
