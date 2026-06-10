'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { updateFeatureFlags, type FeatureFlags } from '@/backend/feature-flags';

const KNOWN_FLAGS: { key: string; label: string; description: string }[] = [
  {
    key: 'record_audio',
    label: 'Record audio',
    description: 'Save call audio recordings.',
  },
];

export function FeatureFlagsForm({
  id,
  flags: initialFlags,
}: {
  id: string;
  flags: FeatureFlags;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags);
  const [pending, setPending] = useState<string | null>(null);

  async function toggleFlag(key: string) {
    const next: FeatureFlags = { ...flags, [key]: !flags[key] };

    setPending(key);
    const res = await updateFeatureFlags(id, next);
    setPending(null);

    if (!res.ok) {
      toast.error('Failed to update feature flag');
      return;
    }

    setFlags(next);
    toast.success('Feature flag updated');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flags</CardTitle>
        <CardDescription>Each toggle is saved immediately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {KNOWN_FLAGS.map((flag, i) => {
          const enabled = !!flags[flag.key];
          return (
            <div key={flag.key}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{flag.label}</p>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                </div>
                <Button
                  variant={enabled ? 'default' : 'outline'}
                  size="sm"
                  disabled={pending === flag.key}
                  onClick={() => toggleFlag(flag.key)}
                  aria-pressed={enabled}
                  className="min-w-[64px]"
                >
                  {pending === flag.key ? 'Saving…' : enabled ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
