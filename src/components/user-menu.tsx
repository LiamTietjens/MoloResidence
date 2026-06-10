'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/backend/auth';
import { Button } from '@/components/ui/button';

export function UserMenu({ displayName }: { displayName: string | null }) {
  return (
    <form action={logoutAction} className="flex items-center gap-3">
      {displayName && (
        <span className="text-sm text-muted-foreground">{displayName}</span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign out</span>
      </Button>
    </form>
  );
}
