'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { Json } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CostRates {
  telnyx?: number;
  livekit_cloud?: number;
  gemini_live?: number;
}

export async function updateCostRates(
  id: string,
  costs: CostRates
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('agent_settings')
    .update({ cost_per_min_usd: costs as unknown as Json })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/cost-rates');
  return { ok: true };
}
