'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RelativeTime } from '@/components/shared/relative-time';
import { PlusIcon } from 'lucide-react';
import type { Tables } from '@/backend/types';
import {
  createStaffUser,
  updateStaffUser,
  setStaffActive,
} from '@/backend/users';

type StaffUser = Pick<
  Tables<'users'>,
  'id' | 'username' | 'display_name' | 'is_active' | 'last_login_at'
>;

export function UsersList({ users }: { users: StaffUser[] }) {
  const router = useRouter();

  async function toggleActive(user: StaffUser) {
    const res = await setStaffActive(user.id, !user.is_active);
    if (!res.ok) {
      toast.error(`Failed: ${res.error}`);
    } else {
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Staff accounts that can sign in to this dashboard.
          </p>
        </div>
        <AddUserDialog onCreated={() => router.refresh()} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Display name</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.display_name ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime date={user.last_login_at} />
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <EditUserDialog user={user} onSaved={() => router.refresh()} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(user)}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirm('');
  }

  async function handleCreate() {
    const uname = username.trim().toLowerCase();
    if (!uname) return toast.error('Username is required.');
    if (password.length < 8)
      return toast.error('Password must be at least 8 characters.');
    if (password !== confirm) return toast.error('Passwords do not match.');

    setBusy(true);
    const res = await createStaffUser({
      username: uname,
      displayName,
      password,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error ?? 'Failed to create user.');
      return;
    }
    toast.success('User created');
    reset();
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Add user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a new staff sign-in. Usernames are stored lowercased.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-username">Username</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jane"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-display">Display name</Label>
            <Input
              id="new-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Kowalski"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-confirm">Confirm password</Label>
            <Input
              id="new-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onSaved,
}: {
  user: StaffUser;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (password || confirm) {
      if (password.length < 8)
        return toast.error('Password must be at least 8 characters.');
      if (password !== confirm) return toast.error('Passwords do not match.');
    }

    setBusy(true);
    const res = await updateStaffUser(user.id, {
      displayName,
      password: password || undefined,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(`Failed: ${res.error}`);
      return;
    }
    toast.success('User updated');
    setPassword('');
    setConfirm('');
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.username}</DialogTitle>
          <DialogDescription>
            Update the display name or set a new password. Leave password blank
            to keep it unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-display">Display name</Label>
            <Input
              id="edit-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-password">New password</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-confirm">Confirm new password</Label>
            <Input
              id="edit-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
