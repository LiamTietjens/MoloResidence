"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const createSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    display_name: z.string().min(1, "Display name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type CreateFormData = z.infer<typeof createSchema>;

interface User {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, is_active, last_login_at")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load users");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleToggle(user: User) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        `${user.username} ${user.is_active ? "deactivated" : "activated"}`
      );
      fetchUsers();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          User Management
        </h1>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer"
              onClick={() => openEdit(user)}
            >
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.display_name || "-"}</TableCell>
              <TableCell>
                {user.last_login_at
                  ? formatDistanceToNow(new Date(user.last_login_at), {
                      addSuffix: true,
                    })
                  : "Never"}
              </TableCell>
              <TableCell>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(user);
                  }}
                  title={user.is_active ? "Deactivate" : "Activate"}
                >
                  {user.is_active ? (
                    <UserX className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          {editingUser ? (
            <EditUserForm
              user={editingUser}
              onClose={() => {
                setDialogOpen(false);
                fetchUsers();
              }}
            />
          ) : (
            <CreateUserForm
              onClose={() => {
                setDialogOpen(false);
                fetchUsers();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  async function onSubmit(data: CreateFormData) {
    const { error } = await supabase.rpc("create_staff_user", {
      p_username: data.username,
      p_password: data.password,
      p_display_name: data.display_name,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("User created");
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register("username")} />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name</Label>
        <Input id="display_name" {...register("display_name")} />
        {errors.display_name && (
          <p className="text-xs text-destructive">
            {errors.display_name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm Password</Label>
        <Input
          id="confirm_password"
          type="password"
          {...register("confirm_password")}
        />
        {errors.confirm_password && (
          <p className="text-xs text-destructive">
            {errors.confirm_password.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditUserForm({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);

    // Update display_name if changed
    if (displayName !== (user.display_name || "")) {
      const { error } = await supabase
        .from("users")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }

    // Update password if provided
    if (password) {
      const { error } = await supabase.rpc("update_staff_password", {
        p_user_id: user.id,
        p_new_password: password,
      });

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }

    toast.success("User updated");
    setSaving(false);
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-display_name">Display Name</Label>
        <Input
          id="edit-display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-password">
          New Password (leave blank to keep)
        </Label>
        <Input
          id="edit-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-confirm_password">Confirm New Password</Label>
        <Input
          id="edit-confirm_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}
