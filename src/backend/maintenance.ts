'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { TablesUpdate } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createTicket(input: {
  property_id: string;
  room_number: string;
  description: string;
  urgency: string;
}): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase.from('maintenance_tickets').insert({
    property_id: input.property_id,
    room_number: input.room_number,
    description: input.description,
    urgency: input.urgency,
    status: 'open',
    created_via: 'dashboard',
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/maintenance');
  return { ok: true };
}

export async function updateTicket(
  id: string,
  patch: TablesUpdate<'maintenance_tickets'>
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('maintenance_tickets')
    .update(patch)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/maintenance');
  revalidatePath('/maintenance/detail');
  return { ok: true };
}
