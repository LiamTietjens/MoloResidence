"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createTicket(data: {
  property_id: string;
  room_number: string;
  description: string;
  urgency: string;
  status?: string;
  notes?: string;
}) {
  const { error } = await supabase.from("maintenance_tickets").insert({
    property_id: data.property_id,
    room_number: data.room_number,
    description: data.description,
    urgency: data.urgency,
    status: data.status || "open",
    notes: data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/maintenance");
  return { success: true };
}

export async function updateTicket(
  id: string,
  data: {
    description?: string;
    urgency?: string;
    status?: string;
    notes?: string;
  }
) {
  const { error } = await supabase
    .from("maintenance_tickets")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${id}`);
  return { success: true };
}
