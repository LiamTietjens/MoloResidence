"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateAgentSettings(data: {
  system_prompt_main: string;
  greeting_text: string;
  transfer_default_phone: string;
}) {
  // Upsert into agent_settings singleton (there's only one row)
  const { data: existing } = await supabase
    .from("agent_settings")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("agent_settings")
      .update({
        system_prompt_main: data.system_prompt_main,
        greeting_text: data.greeting_text,
        transfer_default_phone: data.transfer_default_phone,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("agent_settings").insert({
      system_prompt_main: data.system_prompt_main,
      greeting_text: data.greeting_text,
      transfer_default_phone: data.transfer_default_phone,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/settings/agent");
  return { success: true };
}
