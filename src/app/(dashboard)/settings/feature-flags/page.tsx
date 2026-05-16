import { supabase } from "@/lib/supabase";
import { FeatureFlagsForm } from "./feature-flags-form";

export default async function FeatureFlagsPage() {
  const { data: settings } = await supabase
    .from("agent_settings")
    .select("feature_flags")
    .limit(1)
    .single();

  const flags = (settings?.feature_flags as Record<string, boolean>) || {
    record_audio: false,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
      <p className="text-sm text-muted-foreground">
        Toggle features for the voice agent. Changes take effect on the next
        call.
      </p>
      <FeatureFlagsForm initialFlags={flags} />
    </div>
  );
}
