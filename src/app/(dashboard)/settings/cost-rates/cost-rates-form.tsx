"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { updateCostRates } from "./actions";

interface FormData {
  telnyx_per_min: number;
  livekit_per_min: number;
  gemini_per_min: number;
}

export function CostRatesForm({ initialData }: { initialData: FormData }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: initialData,
  });

  async function onSubmit(data: FormData) {
    const payload = {
      telnyx_per_min: Number(data.telnyx_per_min),
      livekit_per_min: Number(data.livekit_per_min),
      gemini_per_min: Number(data.gemini_per_min),
    };
    const result = await updateCostRates(payload);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Cost rates saved");
    }
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
          <Save data-icon="inline-start" />
          {isSubmitting ? "Saving..." : "Save Rates"}
        </Button>
      </div>
    </form>
  );
}
