'use server';

import { redirect } from 'next/navigation';
import { createSession, destroySession } from '@/backend/session';

export interface LoginState {
  error?: string;
}

// ⚠️ DEMO MODE — FAKE CREDENTIAL LOGIN.
// Accepts ANY non-empty username/password (no database lookup, no bcrypt). Sets
// an iron-session cookie so the rest of the app behaves normally.
//
// To restore real auth, replace this with the users-table + bcrypt version
// (see git history): query `users` via createServerClient(), bcrypt.compare, etc.
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { error: 'Enter any username and password to continue.' };
  }

  // Any non-empty credentials are accepted in demo mode.
  await createSession({ userId: 'demo', displayName: username });
  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
