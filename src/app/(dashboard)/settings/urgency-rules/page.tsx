import { supabase } from "@/lib/supabase";
import { UrgencyRulesClient } from "./urgency-rules-client";

export default async function UrgencyRulesPage() {
  const { data: rules } = await supabase
    .from("urgency_rules")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Urgency Rules</h1>
      <p className="text-sm text-muted-foreground">
        Define urgency levels for maintenance tickets. Rules are displayed in
        priority order (lowest sort_order = highest priority).
      </p>
      <UrgencyRulesClient rules={rules || []} />
    </div>
  );
}
