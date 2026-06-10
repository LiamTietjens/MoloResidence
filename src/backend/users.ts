'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/backend/supabase';
import type { TablesUpdate } from '@/backend/types';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createStaffUser(input: {
  username: string;
  displayName: string;
  password: string;
}): Promise<ActionResult> {
  const username = input.username.trim().toLowerCase();
  if (!username) return { ok: false, error: 'Username is required.' };
  if (input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const supabase = createServerClient();
  const password_hash = await bcrypt.hash(input.password, 10);
  const { error } = await supabase.from('users').insert({
    username,
    display_name: input.displayName.trim() || null,
    password_hash,
    is_active: true,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === '23505'
          ? 'That username is already taken.'
          : error.message,
    };
  }

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function updateStaffUser(
  id: string,
  input: { displayName: string; password?: string }
): Promise<ActionResult> {
  if (input.password && input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const supabase = createServerClient();
  const patch: TablesUpdate<'users'> = {
    display_name: input.displayName.trim() || null,
  };
  if (input.password) {
    patch.password_hash = await bcrypt.hash(input.password, 10);
  }

  const { error } = await supabase.from('users').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function setStaffActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({ is_active: active })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/users');
  return { ok: true };
}
