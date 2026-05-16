'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/session';

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get('username') as string | null;
  const password = formData.get('password') as string | null;

  if (!username || !password) {
    return { error: 'Invalid credentials' };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, display_name, password_hash, is_active')
    .eq('username', username)
    .single();

  if (error || !user) {
    return { error: 'Invalid credentials' };
  }

  if (!user.is_active) {
    return { error: 'Invalid credentials' };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { error: 'Invalid credentials' };
  }

  // Update last_login_at
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  await createSession({
    userId: user.id,
    displayName: user.display_name,
  });

  redirect('/');
}
