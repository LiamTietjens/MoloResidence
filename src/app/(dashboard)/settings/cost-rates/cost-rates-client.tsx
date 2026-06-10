'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { updateCostRates, type CostRates } from '@/backend/cost-rates';

const FIELDS: { key: keyof CostRates; label: string }[] = [
  { key: 'telnyx', label: 'Telnyx / min' },
  { key: 'livekit_cloud', label: 'LiveKit Cloud / min' },
  { key: 'gemini_live', label: 'Gemini Live / min' },
];

export function CostRatesForm({
  id,
  costs,
}: {
  id: string;
  costs: CostRates;
}) {
  const [values, setValues] = useState<Record<keyof CostRates, string>>({
    telnyx: costs.telnyx != null ? String(costs.telnyx) : '',
    livekit_cloud: costs.livekit_cloud != null ? String(costs.livekit_cloud) : '',
    gemini_live: costs.gemini_live != null ? String(costs.gemini_live) : '',
  });
  const [saving, setSaving] = useState(false);

  function parseRate(v: string): number {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  async function handleSave() {
    const cost_per_min_usd: CostRates = {
      telnyx: parseRate(values.telnyx),
      livekit_cloud: parseRate(values.livekit_cloud),
      gemini_live: parseRate(values.gemini_live),
    };

    setSaving(true);
    const res = await updateCostRates(id, cost_per_min_usd);
    setSaving(false);

    if (!res.ok) {
      toast.error('Failed to save cost rates');
      return;
    }

    toast.success('Cost rates saved');
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Per-minute rates (USD)</CardTitle>
          <CardDescription>Rates are stored in US dollars per minute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`rate-${key}`}>{label}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id={`rate-${key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.0001}
                  value={values[key]}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder="0.0000"
                  className="pl-6"
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Changes don&apos;t backfill existing call logs.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );
}
