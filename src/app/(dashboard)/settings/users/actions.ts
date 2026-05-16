"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(data: {
  username: string;
  display_name: string;
  password: string;
}) {
  const password_hash = await bcrypt.hash(data.password, 12);

  const { error } = await supabase.from("users").insert({
    username: data.username,
    display_name: data.display_name,
    password_hash,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    display_name?: string;
    password?: string;
  }
) {
  const updates: Record<string, unknown> = {};

  if (data.username) updates.username = data.username;
  if (data.display_name !== undefined) updates.display_name = data.display_name;
  if (data.password) {
    updates.password_hash = await bcrypt.hash(data.password, 12);
  }

  const { error } = await supabase.from("users").update(updates).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function toggleUserActive(id: string, is_active: boolean) {
  const { error } = await supabase
    .from("users")
    .update({ is_active })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}
