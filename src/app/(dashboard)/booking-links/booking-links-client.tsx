'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/shared/relative-time';
import { CheckIcon, MinusIcon, PhoneIcon, RefreshCwIcon } from 'lucide-react';
import type { Tables } from '@/backend/types';

type BookingLink = Tables<'booking_links'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Show only the last 4 digits, e.g. "•••• 6789". */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4) || phone.slice(-4);
  return `•••• ${last4}`;
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function BookingLinksTable({ links }: { links: BookingLink[] }) {
  const router = useRouter();

  const now = Date.now();
  const sent7d = links.filter(
    (l) => now - new Date(l.sent_at).getTime() <= 7 * DAY_MS
  ).length;
  const sent30d = links.filter(
    (l) => now - new Date(l.sent_at).getTime() <= 30 * DAY_MS
  ).length;
  const totalSent = links.length;
  const clicked = links.filter((l) => l.clicked_at !== null).length;
  const converted = links.filter((l) => l.converted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Booking Links</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
        >
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Sent (7 days)" value={sent7d} />
        <MetricCard title="Sent (30 days)" value={sent30d} />
        <MetricCard
          title="Click-through rate"
          value={pct(clicked, totalSent)}
          subtitle={`${clicked} / ${totalSent} clicked`}
        />
        <MetricCard
          title="Conversion rate"
          value={pct(converted, totalSent)}
          subtitle={`${converted} / ${totalSent} converted`}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <PhoneIcon className="size-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No booking links sent yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Option</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-center">Clicked</TableHead>
                  <TableHead className="text-center">Converted</TableHead>
                  <TableHead className="text-center">Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <RelativeTime
                        date={link.sent_at}
                        className="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="font-mono text-xs cursor-default" />
                            }
                          >
                            {maskPhone(link.phone)}
                          </TooltipTrigger>
                          <TooltipContent>{link.phone}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-medium">
                      {link.guest_name}
                    </TableCell>
                    <TableCell>{link.property_name}</TableCell>
                    <TableCell>{link.booking_option}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(link.check_in)} → {formatDate(link.check_out)}
                    </TableCell>
                    <TableCell className="text-center">
                      {link.num_guests}
                    </TableCell>
                    <TableCell className="text-center">
                      {link.clicked_at ? (
                        <CheckIcon className="inline size-4 text-green-600" />
                      ) : (
                        <MinusIcon className="inline size-4 text-muted-foreground/50" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {link.converted ? (
                        <CheckIcon className="inline size-4 text-green-600" />
                      ) : (
                        <MinusIcon className="inline size-4 text-muted-foreground/50" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {link.call_id ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          render={
                            <Link
                              href={`/calls/detail?id=${link.call_id}`}
                            />
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
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
