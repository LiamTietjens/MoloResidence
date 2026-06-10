import { createServerClient } from '@/backend/supabase';
import { FeatureFlagsForm } from './feature-flags-client';
import type { FeatureFlags } from '@/backend/feature-flags';

export const dynamic = 'force-dynamic';

export default async function FeatureFlagsPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('agent_settings')
    .select('*')
    .limit(1)
    .single();

  const flags = (data?.feature_flags ?? {}) as FeatureFlags;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle optional agent behaviors. Changes apply on the next call.
        </p>
      </div>

      {data ? (
        <FeatureFlagsForm id={data.id} flags={flags} />
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          Failed to load feature flags.
        </p>
      )}
    </div>
  );
}
