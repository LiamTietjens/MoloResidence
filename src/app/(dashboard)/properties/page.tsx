import { createServerClient } from '@/backend/supabase';
import { PropertiesList, type PropertyWithRooms } from './properties-client';
import { NewPropertyDrawer } from './new-property-drawer';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const supabase = createServerClient();

  const [{ data: propertiesData }, { data: roomData }] = await Promise.all([
    supabase
      .from('properties')
      .select(
        'id, name, address, kwhotel_hotel_id, transfer_phone, aliases, language_default, timezone, notes'
      )
      .order('name', { ascending: true }),
    supabase.from('property_rooms').select('property_id, room_number'),
  ]);

  const roomMap: Record<string, string[]> = {};
  for (const row of roomData ?? []) {
    (roomMap[row.property_id] ??= []).push(row.room_number);
  }

  const properties: PropertyWithRooms[] = (propertiesData ?? []).map((p) => ({
    ...p,
    aliases: Array.isArray(p.aliases) ? (p.aliases as string[]) : [],
    rooms: (roomMap[p.id] ?? []).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <NewPropertyDrawer />
      </div>

      {properties.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No properties yet. Create your first property to get started.
        </p>
      ) : (
        <PropertiesList properties={properties} />
      )}
    </div>
  );
}
