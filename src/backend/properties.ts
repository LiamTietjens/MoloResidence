'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import { listRooms } from '@/backend/kwhotel';
import type { TablesUpdate } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Import a property's rooms from KWHotel into property_rooms.
 * Uses the property's kwhotel_hotel_id; only adds rooms not already present.
 */
export async function importRoomsFromKwhotel(
  propertyId: string
): Promise<ActionResult & { added?: number; total?: number }> {
  const supabase = createServerClient();

  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .select('id, kwhotel_hotel_id')
    .eq('id', propertyId)
    .single();
  if (propErr) return { ok: false, error: propErr.message };
  if (!prop?.kwhotel_hotel_id) {
    return { ok: false, error: 'Set a KW Hotel ID for this property first.' };
  }

  let names: string[];
  try {
    const rooms = await listRooms(prop.kwhotel_hotel_id);
    names = [
      ...new Set(rooms.map((r) => (r.name ?? '').trim()).filter((n) => n.length > 0)),
    ];
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  if (names.length === 0) return { ok: true, added: 0, total: 0 };

  const { data: existing } = await supabase
    .from('property_rooms')
    .select('room_number')
    .eq('property_id', propertyId);
  const have = new Set((existing ?? []).map((r) => r.room_number));
  const toAdd = names.filter((n) => !have.has(n));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('property_rooms')
      .insert(toAdd.map((room_number) => ({ property_id: propertyId, room_number })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/properties');
  return { ok: true, added: toAdd.length, total: names.length };
}

export async function createProperty(input: {
  name: string;
  address: string;
  kwhotel_hotel_id: number | null;
  transfer_phone: string | null;
  aliases: string[];
  language_default: string;
  timezone: string;
  notes: string | null;
}): Promise<ActionResult & { id?: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('properties')
    .insert(input)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/properties');
  return { ok: true, id: data.id };
}

export async function updateProperty(
  id: string,
  patch: TablesUpdate<'properties'>
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase.from('properties').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/properties');
  return { ok: true };
}

export async function deleteProperty(id: string): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/properties');
  return { ok: true };
}

export async function addRoom(
  propertyId: string,
  roomNumber: string
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('property_rooms')
    .insert({ property_id: propertyId, room_number: roomNumber });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/properties');
  return { ok: true };
}

export async function removeRoom(
  propertyId: string,
  roomNumber: string
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('property_rooms')
    .delete()
    .eq('property_id', propertyId)
    .eq('room_number', roomNumber);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/properties');
  return { ok: true };
}
