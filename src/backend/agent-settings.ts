'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { TablesUpdate } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateAgentSettings(
  id: string,
  patch: TablesUpdate<'agent_settings'>
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('agent_settings')
    .update(patch)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings/agent');
  return { ok: true };
}
