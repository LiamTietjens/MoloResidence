import { createServerClient } from '@/backend/supabase';
import { CostRatesForm } from './cost-rates-client';
import type { CostRates } from '@/backend/cost-rates';

export const dynamic = 'force-dynamic';

export default async function CostRatesPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('agent_settings')
    .select('*')
    .limit(1)
    .single();

  const costs = (data?.cost_per_min_usd ?? {}) as CostRates;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cost Rates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per-minute pricing used to estimate call costs.
        </p>
      </div>

      {data ? (
        <CostRatesForm id={data.id} costs={costs} />
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          Failed to load cost rates.
        </p>
      )}
    </div>
  );
}
