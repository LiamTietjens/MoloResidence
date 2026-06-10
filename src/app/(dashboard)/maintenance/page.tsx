import { createServerClient } from '@/backend/supabase';
import { MaintenanceClient } from './maintenance-client';
import type { Tables } from '@/backend/types';

export const dynamic = 'force-dynamic';

type Ticket = Tables<'maintenance_tickets'>;
type Property = Tables<'properties'>;

export default async function MaintenancePage() {
  const supabase = createServerClient();

  const [
    { data: ticketData },
    { data: propData },
    { data: roomData },
  ] = await Promise.all([
    supabase.from('maintenance_tickets').select('*'),
    supabase.from('properties').select('*').order('name', { ascending: true }),
    supabase.from('property_rooms').select('property_id, room_number'),
  ]);

  const roomsByProperty: Record<string, string[]> = {};
  for (const row of roomData ?? []) {
    (roomsByProperty[row.property_id] ??= []).push(row.room_number);
  }
  for (const id of Object.keys(roomsByProperty)) {
    roomsByProperty[id].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }

  return (
    <MaintenanceClient
      tickets={(ticketData as Ticket[]) ?? []}
      properties={(propData as Property[]) ?? []}
      roomsByProperty={roomsByProperty}
    />
  );
}
