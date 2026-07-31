import { useMemo } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useOrganizationContext } from '@/hooks/use-organization-settings';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Building2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/organization/$organizationId')({
  component: OrganizationLayout,
});

function OrganizationLayout() {
  const { organizationId } = Route.useParams();

  const { data, isLoading, isError, error } = useOrganizationContext(organizationId);

  // ── Loading State ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="h-8 w-8" />
          <p className="text-sm">Loading organization…</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found State ───────────────────────────────────

  if (isError || !data) {
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
          <p className="text-sm font-medium text-foreground">Organization not found</p>
          <p className="mt-1 text-xs">
            {error?.message ?? 'You may not have access to this organization.'}
          </p>
        </div>
      </div>
    );
  }

  const { organization, userRole } = data;

  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

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

  // ── Organization Header ───────────────────────────────────────

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        {organization.logo ? (
          <img
            src={organization.logo}
            alt={`${organization.name} logo`}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <Building2 className="h-5 w-5 text-muted-foreground" />
        )}
        <h1 className="text-sm font-semibold">{organization.name}</h1>
        <Badge variant={roleBadgeVariant} className="text-xs">
          {roleLabel}
        </Badge>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
