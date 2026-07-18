import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">
          Welcome, <span className="font-medium text-foreground">{user?.name}</span>!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Role: <span className="font-medium">{user?.role}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Email: {user?.email}</p>
      </div>
    </div>
  );
}
