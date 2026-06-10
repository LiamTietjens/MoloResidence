import Link from 'next/link';
import { createServerClient } from '@/backend/supabase';
import type { Tables } from '@/backend/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MaintenanceDetailClient } from '../maintenance-detail-client';

export const dynamic = 'force-dynamic';

type Ticket = Tables<'maintenance_tickets'>;

function NotFound() {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/maintenance" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to Maintenance
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Not Found</h1>
      <p className="text-muted-foreground">
        The ticket you are looking for does not exist or the ID is missing.
      </p>
    </div>
  );
}

export default async function MaintenanceDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return <NotFound />;
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return <NotFound />;
  }

  const ticket = data as Ticket;

  const [{ data: prop }, ruleResult] = await Promise.all([
    supabase
      .from('properties')
      .select('name')
      .eq('id', ticket.property_id)
      .single(),
    ticket.urgency_rule_id
      ? supabase
          .from('urgency_rules')
          .select('name')
          .eq('id', ticket.urgency_rule_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <MaintenanceDetailClient
      ticket={ticket}
      propertyName={prop?.name ?? 'Unknown'}
      urgencyRuleName={(ruleResult.data as { name: string } | null)?.name ?? null}
    />
  );
}
