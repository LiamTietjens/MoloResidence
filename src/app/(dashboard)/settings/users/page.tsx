import { createServerClient } from '@/backend/supabase';
import { UsersList } from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, is_active, last_login_at')
    .order('username');

  return <UsersList users={data ?? []} />;
}
