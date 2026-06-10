'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createKnowledgeBase(
  name: string
): Promise<ActionResult & { id?: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('knowledge_bases')
    .insert({ name: name.trim(), kind: 'general', property_id: null, content: '' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/knowledge-bases');
  return { ok: true, id: data.id };
}

export interface KbDetailData {
  kb: { id: string; name: string; content: string | null } | null;
  properties: { id: string; name: string }[];
  propRooms: { property_id: string; room_number: string }[];
  allKbRooms: {
    room_number: string;
    knowledge_base_id: string;
    knowledge_bases: { id: string; name: string; property_id: string | null } | null;
  }[];
}

/** All reads the detail editor needs, in one server round-trip (service-role). */
export async function getKbDetailData(id: string): Promise<KbDetailData> {
  const supabase = createServerClient();
  const [{ data: kb }, { data: properties }, { data: propRooms }, { data: allKbRooms }] =
    await Promise.all([
      supabase.from('knowledge_bases').select('id, name, content').eq('id', id).single(),
      supabase.from('properties').select('id, name').order('name'),
      supabase.from('property_rooms').select('property_id, room_number').order('room_number'),
      supabase
        .from('knowledge_base_rooms')
        .select('room_number, knowledge_base_id, knowledge_bases(id, name, property_id)')
        .order('room_number'),
    ]);

  return {
    kb: kb ?? null,
    properties: properties ?? [],
    propRooms: propRooms ?? [],
    allKbRooms: (allKbRooms ?? []) as KbDetailData['allKbRooms'],
  };
}

export async function updateKbName(id: string, name: string): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_bases')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/knowledge-bases');
  return { ok: true };
}

export async function updateKbContent(id: string, content: string): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_bases')
    .update({ content })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Replace this KB's room assignments with the given list (delete-then-insert). */
export async function saveRoomAssignments(
  id: string,
  roomNumbers: string[]
): Promise<ActionResult> {
  const supabase = createServerClient();
  await supabase.from('knowledge_base_rooms').delete().eq('knowledge_base_id', id);
  if (roomNumbers.length > 0) {
    const { error } = await supabase
      .from('knowledge_base_rooms')
      .insert(roomNumbers.map((room_number) => ({ knowledge_base_id: id, room_number })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/knowledge-bases');
  return { ok: true };
}

export async function removeRoomFromKb(
  otherKbId: string,
  roomNumber: string
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_base_rooms')
    .delete()
    .eq('knowledge_base_id', otherKbId)
    .eq('room_number', roomNumber);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteKnowledgeBase(id: string): Promise<ActionResult> {
  const supabase = createServerClient();
  await supabase.from('knowledge_base_rooms').delete().eq('knowledge_base_id', id);
  const { error } = await supabase.from('knowledge_bases').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/knowledge-bases');
  return { ok: true };
}
