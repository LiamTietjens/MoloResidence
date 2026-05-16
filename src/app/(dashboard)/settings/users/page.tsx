import { supabase } from "@/lib/supabase";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const { data: users } = await supabase
    .from("users")
    .select("id, username, display_name, is_active, last_login_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          User Management
        </h1>
      </div>
      <UsersClient users={users || []} />
    </div>
  );
}
