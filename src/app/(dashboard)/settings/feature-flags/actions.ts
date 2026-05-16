"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateFeatureFlags(data: {
  record_audio: boolean;
  [key: string]: boolean;
}) {
  const { data: existing } = await supabase
    .from("agent_settings")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("agent_settings")
      .update({ feature_flags: data })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("agent_settings")
      .insert({ feature_flags: data });

    if (error) return { error: error.message };
  }

  revalidatePath("/settings/feature-flags");
  return { success: true };
}
