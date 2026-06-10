import { createServerClient } from '@/backend/supabase';
import type { Tables } from '@/backend/types';
import { CallsList } from './calls-client';

export const dynamic = 'force-dynamic';

type CallLog = Tables<'call_logs'>;
type Property = Pick<Tables<'properties'>, 'id' | 'name'>;

export default async function CallsPage() {
  const supabase = createServerClient();

  const [{ data: callsData }, { data: propertiesData }] = await Promise.all([
    supabase.from('call_logs').select('*').order('started_at', {
      ascending: false,
    }),
    supabase.from('properties').select('id, name').order('name'),
  ]);

  const calls = (callsData ?? []) as CallLog[];
  const properties = (propertiesData ?? []) as Property[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
      <CallsList calls={calls} properties={properties} />
    </div>
  );
}
