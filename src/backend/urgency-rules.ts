'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { Json } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function saveUrgencyExamples(
  ruleId: string,
  examples: string[]
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('urgency_rules')
    .update({ examples: examples as unknown as Json })
    .eq('id', ruleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/urgency-rules');
  return { ok: true };
}
