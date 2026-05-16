import { supabase } from "@/lib/supabase";
import { CostRatesForm } from "./cost-rates-form";

export default async function CostRatesPage() {
  const { data: settings } = await supabase
    .from("agent_settings")
    .select("cost_per_min_usd")
    .limit(1)
    .single();

  const rates = settings?.cost_per_min_usd as {
    telnyx?: number;
    livekit?: number;
    gemini?: number;
  } | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cost Rates</h1>
      <p className="text-sm text-muted-foreground">
        Configure per-minute costs for each service used by the voice agent.
        These rates are used to calculate the cost of each call.
      </p>
      <CostRatesForm
        initialData={{
          telnyx_per_min: rates?.telnyx ?? 0,
          livekit_per_min: rates?.livekit ?? 0,
          gemini_per_min: rates?.gemini ?? 0,
        }}
      />
    </div>
  );
}
