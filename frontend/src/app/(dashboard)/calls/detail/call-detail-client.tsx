'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tables } from '@/backend/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { CopyButton } from '@/components/shared/copy-button';
import { JsonView } from '@/components/shared/json-view';
import {
  ArrowLeft,
  ExternalLink,
  Wrench,
  LinkIcon,
  ArrowRight,
} from 'lucide-react';

type CallLog = Tables<'call_logs'>;

/** Format a duration in seconds as "m:ss". Returns an em dash for null. */
function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface CostRates {
  telnyx?: number;
  livekit_cloud?: number;
  gemini_live?: number;
  [key: string]: number | undefined;
}

const RATE_LABELS: Record<string, string> = {
  telnyx: 'Telnyx',
  livekit_cloud: 'LiveKit Cloud',
  gemini_live: 'Gemini Live',
};

export interface LinkedTicket {
  id: string;
  room_number: string;
  status: string;
  urgency: string;
}

export interface LinkedBooking {
  id: string;
  guest_name: string;
  converted: boolean;
}

export function CallDetail({
  call,
  propertyName,
  costRates,
  tickets,
  bookings,
}: {
  call: CallLog;
  propertyName: string | null;
  costRates: CostRates | null;
  tickets: LinkedTicket[];
  bookings: LinkedBooking[];
}) {
  const [transcriptFilter, setTranscriptFilter] = useState('');

  // Cost breakdown computed from duration (minutes) × each per-minute rate.
  const durationMinutes =
    call.duration_seconds != null ? call.duration_seconds / 60 : null;

  const breakdown =
    costRates && durationMinutes != null
      ? Object.entries(costRates)
          .filter(([, rate]) => typeof rate === 'number')
          .map(([key, rate]) => ({
            label: RATE_LABELS[key] ?? key,
            amount: (rate as number) * durationMinutes,
          }))
      : [];
  const breakdownTotal = breakdown.reduce((sum, b) => sum + b.amount, 0);

  const toolCalls = Array.isArray(call.tool_calls) ? call.tool_calls : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/calls" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to Calls
      </Button>

      {/* Metadata block */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <span className="font-mono text-sm text-muted-foreground">
                {call.id}
              </span>
              <CopyButton text={call.id} />
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="direction" value={call.direction} />
              <StatusBadge kind="mode" value={call.mode} />
              <StatusBadge kind="outcome" value={call.outcome} />
              <StatusBadge kind="sentiment" value={call.sentiment} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Started">
              <RelativeTime date={call.started_at} />
            </Field>
            <Field label="Ended">
              <RelativeTime date={call.ended_at} />
            </Field>
            <Field label="Duration">
              <span className="tabular-nums">
                {formatDuration(call.duration_seconds)}
              </span>
            </Field>
            <Field label="From → To">
              <span className="flex items-center gap-1.5 font-mono text-xs">
                {call.from_number ?? '—'}
                <ArrowRight className="size-3 text-muted-foreground" />
                {call.to_did ?? '—'}
              </span>
            </Field>
            <Field label="Property">{propertyName ?? '—'}</Field>
            <Field label="Room">{call.room_number ?? '—'}</Field>
            <Field label="Reservation ID">
              {call.reservation_id ? (
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  {call.reservation_id}
                  <CopyButton text={call.reservation_id} />
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Language">{call.language ?? '—'}</Field>
            <Field label="Cost">
              {call.cost_usd != null ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-help tabular-nums underline decoration-dotted underline-offset-2" />
                      }
                    >
                      ${Number(call.cost_usd).toFixed(4)}
                    </TooltipTrigger>
                    <TooltipContent>
                      {breakdown.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {breakdown.map((b) => (
                            <div
                              key={b.label}
                              className="flex justify-between gap-4"
                            >
                              <span>{b.label}</span>
                              <span className="tabular-nums">
                                ${b.amount.toFixed(4)}
                              </span>
                            </div>
                          ))}
                          <div className="mt-1 flex justify-between gap-4 border-t pt-1 font-medium">
                            <span>Total</span>
                            <span className="tabular-nums">
                              ${breakdownTotal.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs">
                          No rate breakdown available.
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                '—'
              )}
            </Field>
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="tools">Tool Calls</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-6 pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {call.summary ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {call.summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Linked Entities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.length === 0 && bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No maintenance tickets or booking links linked to this call.
                </p>
              ) : (
                <>
                  {tickets.map((t) => (
                    <Link
                      key={t.id}
                      href={`/maintenance/detail?id=${t.id}`}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <Wrench className="size-4 text-muted-foreground" />
                      <span className="font-medium">Room {t.room_number}</span>
                      <StatusBadge kind="status" value={t.status} />
                      <StatusBadge kind="urgency" value={t.urgency} />
                      <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <LinkIcon className="size-4 text-muted-foreground" />
                      <span className="font-medium">{b.guest_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.converted ? 'Converted' : 'Sent'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript */}
        <TabsContent value="transcript" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Filter transcript..."
                value={transcriptFilter}
                onChange={(e) => setTranscriptFilter(e.target.value)}
                className="max-w-sm"
                disabled={!call.transcript_url}
              />
              {call.transcript_url ? (
                <p className="text-sm text-muted-foreground">
                  The transcript is hosted externally.{' '}
                  <a
                    href={call.transcript_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
                  >
                    Open transcript
                    <ExternalLink className="size-3.5" />
                  </a>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transcript available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recording */}
        <TabsContent value="recording" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recording</CardTitle>
            </CardHeader>
            <CardContent>
              {call.recording_url ? (
                <audio
                  controls
                  src={call.recording_url}
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Recording disabled / not available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tool calls */}
        <TabsContent value="tools" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {toolCalls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tool calls recorded for this call.
                </p>
              ) : (
                <ol className="space-y-4">
                  {toolCalls.map((raw, i) => (
                    <ToolCallItem key={i} index={i} item={raw} />
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw JSON */}
        <TabsContent value="raw" className="pt-2">
          <JsonView data={call.tool_calls} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function ToolCallItem({ index, item }: { index: number; item: unknown }) {
  // Items may be arbitrary objects — pull a few common fields defensively.
  const obj =
    item && typeof item === 'object' && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : null;

  const name =
    (obj?.name as string) ??
    (obj?.tool as string) ??
    (obj?.function as string) ??
    `Tool call ${index + 1}`;
  const args = obj?.args ?? obj?.arguments ?? obj?.input;
  const result = obj?.result ?? obj?.output ?? obj?.response;
  const latency =
    (obj?.latency as number | string) ??
    (obj?.latency_ms as number | string) ??
    (obj?.duration_ms as number | string) ??
    null;

  return (
    <li className="relative border-l pl-6">
      <span className="absolute top-1 -left-[5px] size-2.5 rounded-full bg-primary" />
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{String(name)}</span>
        {latency != null && (
          <span className="text-xs text-muted-foreground">{String(latency)}{typeof latency === 'number' ? ' ms' : ''}</span>
        )}
      </div>

      {args !== undefined && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Args</p>
          <ValueBlock value={args} />
        </div>
      )}
      {result !== undefined && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Result
          </p>
          <ValueBlock value={result} />
        </div>
      )}

      <div className="mt-2">
        <JsonView data={item} />
      </div>
      <Separator className="mt-4" />
    </li>
  );
}

function ValueBlock({ value }: { value: unknown }) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <span className="font-mono text-xs break-words">{String(value)}</span>
    );
  }
  return (
    <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 text-xs leading-relaxed font-mono">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
