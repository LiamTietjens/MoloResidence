import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Server-only Supabase client using the SERVICE-ROLE key.
 *
 * This is the ONLY way the dashboard touches the database (plan §6). The
 * service-role key bypasses RLS, so it must never reach the browser — the
 * `server-only` import above makes any client-component import a build error.
 *
 * A fresh client per call keeps things stateless across server requests.
 */
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
