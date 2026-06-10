import { redirect } from 'next/navigation';
import { getSession } from '@/backend/session';
import { AppSidebar } from '@/components/app-sidebar';
import { UserMenu } from '@/components/user-menu';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center border-b px-6">
          <div className="flex-1" />
          <UserMenu displayName={session.displayName} />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
