import Link from 'next/link';
import { createServerClient } from '@/backend/supabase';
import type { Tables } from '@/backend/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  CallDetail,
  type CostRates,
  type LinkedTicket,
  type LinkedBooking,
} from './call-detail-client';

export const dynamic = 'force-dynamic';

type CallLog = Tables<'call_logs'>;

export default async function CallDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let call: CallLog | null = null;
  let propertyName: string | null = null;
  let costRates: CostRates | null = null;
  let tickets: LinkedTicket[] = [];
  let bookings: LinkedBooking[] = [];

  if (id) {
    const supabase = createServerClient();

    const { data: callData } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', id)
      .single();

    call = (callData as CallLog | null) ?? null;

    if (call) {
      // Property name, cost rates, linked entities — independent, fetch together.
      const [
        { data: propData },
        { data: settingsData },
        { data: ticketData },
        { data: bookingData },
      ] = await Promise.all([
        call.property_id
          ? supabase
              .from('properties')
              .select('name')
              .eq('id', call.property_id)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from('agent_settings')
          .select('cost_per_min_usd')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('maintenance_tickets')
          .select('id, room_number, status, urgency')
          .eq('call_id', id),
        supabase
          .from('booking_links')
          .select('id, guest_name, converted')
          .eq('call_id', id),
      ]);

      propertyName = (propData as { name: string } | null)?.name ?? null;

      const rates = (settingsData as { cost_per_min_usd: unknown } | null)
        ?.cost_per_min_usd;
      costRates =
        rates && typeof rates === 'object' ? (rates as CostRates) : null;

      tickets = (ticketData as LinkedTicket[]) ?? [];
      bookings = (bookingData as LinkedBooking[]) ?? [];
    }
  }

  if (!call) {
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

  return (
    <CallDetail
      call={call}
      propertyName={propertyName}
      costRates={costRates}
      tickets={tickets}
      bookings={bookings}
    />
  );
}
