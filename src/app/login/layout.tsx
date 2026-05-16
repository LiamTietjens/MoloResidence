'use client';

import { AuthProvider } from '@/lib/auth-context';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        {children}
      </div>
    </AuthProvider>
  );
}
