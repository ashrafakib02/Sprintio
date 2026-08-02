import { useEffect, useMemo } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceContext, WORKSPACE_CONTEXT_QUERY_KEY } from '@/hooks/use-workspace-settings';
import { switchWorkspace } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/workspace/$workspaceId')({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useWorkspaceContext(workspaceId);

  // When entering a workspace route, validate and switch to it so the
  // server-side workspace context is set correctly. This ensures the
  // query cache contains fresh data that child routes can consume.
  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    // Safety timeout — if the switch + query never resolves, redirect
    // to dashboard so the user is never stuck on a loading page.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        navigate({ to: '/dashboard' });
      }
    }, 8_000);

    switchWorkspace(workspaceId)
      .then((response) => {
        if (cancelled) return;

        // Seed the query cache so child routes and other consumers
        // see up-to-date workspace data without an extra fetch.
        queryClient.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY(workspaceId), response);
      })
      .catch((err: Error) => {
        if (cancelled) return;

        const msg = err.message ?? '';

        if (
          msg.includes('CSRF_MISSING_HEADER') ||
          msg.includes('CSRF_ORIGIN_MISMATCH') ||
          msg.includes('CSRF validation failed')
        ) {
          toast.error('Session validation failed', {
            description: 'A security check failed. Please refresh the page and try again.',
          });
        }

        navigate({ to: '/dashboard' });
      })
      .finally(() => {
        clearTimeout(fallbackTimer);
      });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [workspaceId, queryClient, navigate]);

  // ── Derived values (must be before any early returns for Rules of Hooks) ──

  const workspace = data?.workspace;
  const userRole = data?.userRole;

  const roleLabel = useMemo(
    () => (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''),
    [userRole],
  );

  const roleBadgeVariant = useMemo(() => {
    switch (userRole) {
      case 'owner':
        return 'default' as const;
      case 'admin':
        return 'info' as const;
      case 'member':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  }, [userRole]);

  const planBadgeVariant = useMemo(() => {
    switch (workspace?.plan) {
      case 'enterprise':
        return 'info' as const;
      case 'pro':
        return 'warning' as const;
      default:
        return 'secondary' as const;
    }
  }, [workspace?.plan]);

  // ── Loading State ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="h-8 w-8" />
          <p className="text-sm">Loading workspace…</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found State ───────────────────────────────────

  if (isError || !data || !workspace) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground"
        role="alert"
        aria-live="assertive"
      >
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Workspace not found</p>
          <p className="mt-1 text-xs">
            {error?.message ?? 'You may not have access to this workspace.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Workspace Header ──────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        {workspace.logo ? (
          <img
            src={workspace.logo}
            alt={`${workspace.name} logo`}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <Briefcase className="h-5 w-5 text-muted-foreground" />
        )}
        <h1 className="text-sm font-semibold">{workspace.name}</h1>
        <Badge variant={roleBadgeVariant} className="text-xs">
          {roleLabel}
        </Badge>
        {workspace.plan !== 'free' && (
          <Badge variant={planBadgeVariant} className="text-xs capitalize">
            {workspace.plan}
          </Badge>
        )}
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
