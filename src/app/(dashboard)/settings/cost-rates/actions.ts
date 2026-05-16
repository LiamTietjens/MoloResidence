"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateCostRates(data: {
  telnyx_per_min: number;
  livekit_per_min: number;
  gemini_per_min: number;
}) {
  const { data: existing } = await supabase
    .from("agent_settings")
    .select("id")
    .limit(1)
    .single();

  const cost_per_min_usd = {
    telnyx: data.telnyx_per_min,
    livekit: data.livekit_per_min,
    gemini: data.gemini_per_min,
  };

  if (existing) {
    const { error } = await supabase
      .from("agent_settings")
      .update({ cost_per_min_usd })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("agent_settings")
      .insert({ cost_per_min_usd });

    if (error) return { error: error.message };
  }

  revalidatePath("/settings/cost-rates");
  return { success: true };
}
