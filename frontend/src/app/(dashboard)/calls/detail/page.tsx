'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/backend/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { fetchCall } from '@/lib/calls-api';
import {
  CallDetail,
  type CostRates,
  type LinkedTicket,
  type LinkedBooking,
} from './call-detail-client';

type CallLog = Tables<'call_logs'>;

function NotFound() {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/calls" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to Calls
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Call Not Found</h1>
      <p className="text-muted-foreground">
        The call you are looking for does not exist or the ID is missing.
      </p>
    </div>
  );
}

function CallDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['calls', id],
    queryFn: () => fetchCall(id),
    enabled: !!id,
  });

  if (!id) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/calls" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to Calls
        </Button>
        <p className="text-sm text-muted-foreground">Loading call…</p>
      </div>
    );
  }

  if (isError || !data?.call) {
    return <NotFound />;
  }

  const { call, propertyName, costRates, tickets, bookings } = data;

  return (
    <CallDetail
      call={call as unknown as CallLog}
      propertyName={propertyName}
      costRates={costRates as CostRates | null}
      tickets={tickets as unknown as LinkedTicket[]}
      bookings={bookings as unknown as LinkedBooking[]}
    />
  );
}

export default function CallDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/calls" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to Calls
          </Button>
          <p className="text-sm text-muted-foreground">Loading call…</p>
        </div>
      }
    >
      <CallDetailContent />
    </Suspense>
  );
}
