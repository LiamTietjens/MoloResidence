import { supabase } from "@/lib/supabase";
import { AgentSettingsForm } from "./agent-settings-form";

export default async function AgentSettingsPage() {
  const { data: settings } = await supabase
    .from("agent_settings")
    .select("system_prompt_main, greeting_text, transfer_default_phone")
    .limit(1)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Agent Settings</h1>
      <AgentSettingsForm
        initialData={{
          system_prompt_main: settings?.system_prompt_main || "",
          greeting_text: settings?.greeting_text || "",
          transfer_default_phone: settings?.transfer_default_phone || "",
        }}
      />
    </div>
  );
}
