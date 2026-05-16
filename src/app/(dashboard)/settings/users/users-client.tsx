"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

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
  DialogTrigger,
} from "@/components/ui/dialog";

import { createUser, updateUser, toggleUserActive } from "./actions";

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

const editSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    display_name: z.string().min(1, "Display name is required"),
    password: z.string().optional(),
    confirm_password: z.string().optional(),
  })
  .refine(
    (d) => !d.password || d.password === d.confirm_password,
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  );

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface User {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
}

export function UsersClient({ users }: { users: User[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleToggle(user: User) {
    const result = await toggleUserActive(user.id, !user.is_active);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `${user.username} ${user.is_active ? "deactivated" : "activated"}`
      );
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
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
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(user);
                  }}
                  title={user.is_active ? "Deactivate" : "Activate"}
                >
                  {user.is_active ? <UserX /> : <UserCheck />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
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
              onClose={() => setDialogOpen(false)}
            />
          ) : (
            <CreateUserForm onClose={() => setDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
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
    const result = await createUser({
      username: data.username,
      display_name: data.display_name,
      password: data.password,
    });
    if (result.error) {
      toast.error(result.error);
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      username: user.username,
      display_name: user.display_name || "",
      password: "",
      confirm_password: "",
    },
  });

  async function onSubmit(data: EditFormData) {
    const result = await updateUser(user.id, {
      username: data.username,
      display_name: data.display_name,
      password: data.password || undefined,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User updated");
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-username">Username</Label>
        <Input id="edit-username" {...register("username")} />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-display_name">Display Name</Label>
        <Input id="edit-display_name" {...register("display_name")} />
        {errors.display_name && (
          <p className="text-xs text-destructive">
            {errors.display_name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-password">New Password (leave blank to keep)</Label>
        <Input id="edit-password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-confirm_password">Confirm New Password</Label>
        <Input
          id="edit-confirm_password"
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
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
