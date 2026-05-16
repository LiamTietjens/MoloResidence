"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { updateFeatureFlags } from "./actions";

const FLAG_LABELS: Record<string, string> = {
  record_audio: "Record Audio",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  record_audio:
    "When enabled, call audio will be recorded and stored for playback in call logs.",
};

export function FeatureFlagsForm({
  initialFlags,
}: {
  initialFlags: Record<string, boolean>;
}) {
  const [flags, setFlags] = useState(initialFlags);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function toggle(key: string) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateFeatureFlags(flags as { record_audio: boolean });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Feature flags saved");
      setDirty(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(flags).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {FLAG_LABELS[key] || key}
                </Label>
                {FLAG_DESCRIPTIONS[key] && (
                  <p className="text-xs text-muted-foreground">
                    {FLAG_DESCRIPTIONS[key]}
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  value ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    value ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !dirty}>
          <Save data-icon="inline-start" />
          {saving ? "Saving..." : "Save Flags"}
        </Button>
      </div>
    </div>
  );
}
