"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FLAG_LABELS: Record<string, string> = {
  record_audio: "Record Audio",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  record_audio:
    "When enabled, call audio will be recorded and stored for playback in call logs.",
};

export default function FeatureFlagsPage() {
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({
    record_audio: false,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function fetchFlags() {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("id, feature_flags")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        toast.error("Failed to load feature flags");
      }

      if (data) {
        setSettingsId(data.id);
        const loadedFlags = (data.feature_flags as Record<string, boolean>) || {
          record_audio: false,
        };
        setFlags(loadedFlags);
      }
      setLoading(false);
    }

    fetchFlags();
  }, []);

  function toggle(key: string) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);

    if (settingsId) {
      const { error } = await supabase
        .from("agent_settings")
        .update({ feature_flags: flags })
        .eq("id", settingsId);

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("agent_settings")
        .insert({ feature_flags: flags });

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }

    toast.success("Feature flags saved");
    setDirty(false);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Feature Flags
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
      <p className="text-sm text-muted-foreground">
        Toggle features for the voice agent. Changes take effect on the next
        call.
      </p>

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
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Flags"}
        </Button>
      </div>
    </div>
  );
}
