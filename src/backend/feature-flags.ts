'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { Json } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface FeatureFlags {
  record_audio?: boolean;
  [key: string]: boolean | undefined;
}

export async function updateFeatureFlags(
  id: string,
  flags: FeatureFlags
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('agent_settings')
    .update({ feature_flags: flags as unknown as Json })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/feature-flags');
  return { ok: true };
}
