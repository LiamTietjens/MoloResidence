"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface KnowledgeBaseFormData {
  name: string;
  kind: "general" | "property" | "exception";
  property_id: string | null;
  is_default_general: boolean;
  content: string;
  room_numbers: string[];
}

export async function createKnowledgeBase(data: KnowledgeBaseFormData) {
  const { data: kb, error } = await supabase
    .from("knowledge_bases")
    .insert({
      name: data.name,
      kind: data.kind,
      property_id: data.kind === "general" ? null : data.property_id,
      is_default_general: data.kind === "general" ? data.is_default_general : false,
      content: data.content,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Insert room assignments for non-general KBs
  if (data.kind !== "general" && data.room_numbers.length > 0) {
    const roomRows = data.room_numbers.map((room_number) => ({
      knowledge_base_id: kb.id,
      room_number: room_number.trim(),
    }));

    const { error: roomError } = await supabase
      .from("knowledge_base_rooms")
      .insert(roomRows);

    if (roomError) {
      return { error: roomError.message };
    }
  }

  revalidatePath("/knowledge-bases");
  redirect("/knowledge-bases");
}

export async function updateKnowledgeBase(id: string, data: KnowledgeBaseFormData) {
  const { error } = await supabase
    .from("knowledge_bases")
    .update({
      name: data.name,
      kind: data.kind,
      property_id: data.kind === "general" ? null : data.property_id,
      is_default_general: data.kind === "general" ? data.is_default_general : false,
      content: data.content,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Re-sync room assignments: delete all then re-insert
  await supabase
    .from("knowledge_base_rooms")
    .delete()
    .eq("knowledge_base_id", id);

  if (data.kind !== "general" && data.room_numbers.length > 0) {
    const roomRows = data.room_numbers.map((room_number) => ({
      knowledge_base_id: id,
      room_number: room_number.trim(),
    }));

    const { error: roomError } = await supabase
      .from("knowledge_base_rooms")
      .insert(roomRows);

    if (roomError) {
      return { error: roomError.message };
    }
  }

  revalidatePath("/knowledge-bases");
  redirect("/knowledge-bases");
}

export async function deleteKnowledgeBase(id: string) {
  const { error } = await supabase
    .from("knowledge_bases")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/knowledge-bases");
  redirect("/knowledge-bases");
}

export async function duplicateKnowledgeBase(id: string) {
  // Fetch original KB
  const { data: original, error: fetchError } = await supabase
    .from("knowledge_bases")
    .select("*, knowledge_base_rooms(room_number)")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    return { error: fetchError?.message || "Knowledge base not found" };
  }

  // Create duplicate
  const { data: duplicate, error: insertError } = await supabase
    .from("knowledge_bases")
    .insert({
      name: `${original.name} (copy)`,
      kind: original.kind,
      property_id: original.property_id,
      is_default_general: false, // Never duplicate the default flag
      content: original.content,
    })
    .select("id")
    .single();

  if (insertError || !duplicate) {
    return { error: insertError?.message || "Failed to duplicate" };
  }

  // Copy room assignments
  if (original.knowledge_base_rooms && original.knowledge_base_rooms.length > 0) {
    const roomRows = original.knowledge_base_rooms.map(
      (r: { room_number: string }) => ({
        knowledge_base_id: duplicate.id,
        room_number: r.room_number,
      })
    );

    await supabase.from("knowledge_base_rooms").insert(roomRows);
  }

  revalidatePath("/knowledge-bases");
  redirect(`/knowledge-bases/${duplicate.id}`);
}
