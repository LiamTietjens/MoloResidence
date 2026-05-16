"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormData {
  telnyx_per_min: number;
  livekit_per_min: number;
  gemini_per_min: number;
}

export default function CostRatesPage() {
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<FormData | null>(null);

  useEffect(() => {
    async function fetchRates() {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("id, cost_per_min_usd")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        toast.error("Failed to load cost rates");
      }

      if (data) {
        setSettingsId(data.id);
        const rates = data.cost_per_min_usd as {
          telnyx?: number;
          livekit?: number;
          gemini?: number;
        } | null;
        setInitialData({
          telnyx_per_min: rates?.telnyx ?? 0,
          livekit_per_min: rates?.livekit ?? 0,
          gemini_per_min: rates?.gemini ?? 0,
        });
      } else {
        setInitialData({
          telnyx_per_min: 0,
          livekit_per_min: 0,
          gemini_per_min: 0,
        });
      }
      setLoading(false);
    }

    fetchRates();
  }, []);

  if (loading || !initialData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Cost Rates</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cost Rates</h1>
      <p className="text-sm text-muted-foreground">
        Configure per-minute costs for each service used by the voice agent.
        These rates are used to calculate the cost of each call.
      </p>
      <CostRatesForm initialData={initialData} settingsId={settingsId} />
    </div>
  );
}

function CostRatesForm({
  initialData,
  settingsId,
}: {
  initialData: FormData;
  settingsId: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: initialData,
  });

  async function onSubmit(data: FormData) {
    const cost_per_min_usd = {
      telnyx: Number(data.telnyx_per_min),
      livekit: Number(data.livekit_per_min),
      gemini: Number(data.gemini_per_min),
    };

    if (settingsId) {
      const { error } = await supabase
        .from("agent_settings")
        .update({ cost_per_min_usd })
        .eq("id", settingsId);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("agent_settings")
        .insert({ cost_per_min_usd });

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    toast.success("Cost rates saved");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Per-Minute Rates (USD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telnyx_per_min">Telnyx per minute</Label>
            <Input
              id="telnyx_per_min"
              type="number"
              step="0.0001"
              min="0"
              {...register("telnyx_per_min")}
            />
            {errors.telnyx_per_min && (
              <p className="text-xs text-destructive">
                {errors.telnyx_per_min.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="livekit_per_min">LiveKit Cloud per minute</Label>
            <Input
              id="livekit_per_min"
              type="number"
              step="0.0001"
              min="0"
              {...register("livekit_per_min")}
            />
            {errors.livekit_per_min && (
              <p className="text-xs text-destructive">
                {errors.livekit_per_min.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gemini_per_min">Gemini Live per minute</Label>
            <Input
              id="gemini_per_min"
              type="number"
              step="0.0001"
              min="0"
              {...register("gemini_per_min")}
            />
            {errors.gemini_per_min && (
              <p className="text-xs text-destructive">
                {errors.gemini_per_min.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Rates"}
        </Button>
      </div>
    </form>
  );
}
