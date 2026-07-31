import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useLogout } from '@/hooks/use-logout';
import { Spinner } from '@/components/ui/spinner';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { OrganizationSwitcher } from '@/components/organization/organization-switcher';
import { getAuthState } from '@/lib/auth-store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { user, isLoading } = getAuthState();
    // Only redirect if auth has finished loading and user is not present
    if (!isLoading && !user) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();
  const logout = useLogout();

  // Show loading state while auth is being resolved
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Fallback if beforeLoad didn't catch it (e.g., auth resolved after load)
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to="/" className="text-lg font-semibold">
            Sprintio
          </Link>
        </div>

        {/* Organization Switcher */}
        <div className="border-b border-border p-3">
          <OrganizationSwitcher />
        </div>

        {/* Workspace Switcher */}
        <div className="border-b border-border p-3">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <Link
            to="/dashboard"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            activeProps={{ className: 'bg-accent text-accent-foreground' }}
          >
            Dashboard
          </Link>
          <Link
            to="/settings"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            activeProps={{ className: 'bg-accent text-accent-foreground' }}
          >
            Settings
          </Link>
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="mt-3 w-full rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
