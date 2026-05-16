"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createRule(data: {
  name: string;
  level: string;
  keywords: string[];
  examples: string[];
  sort_order: number;
}) {
  const { error } = await supabase.from("urgency_rules").insert(data);

  if (error) return { error: error.message };

  revalidatePath("/settings/urgency-rules");
  return { success: true };
}

export async function updateRule(
  id: string,
  data: {
    name?: string;
    level?: string;
    keywords?: string[];
    examples?: string[];
    sort_order?: number;
  }
) {
  const { error } = await supabase
    .from("urgency_rules")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/urgency-rules");
  return { success: true };
}

export async function deleteRule(id: string) {
  const { error } = await supabase
    .from("urgency_rules")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/urgency-rules");
  return { success: true };
}
