import { useState } from 'react';
import { Outlet, Link, useMatchRoute } from '@tanstack/react-router';
import { useOrganizationContext } from '@/hooks/use-organization-settings';
import { Spinner } from '@/components/ui/spinner';
import { Settings, Users, ArrowLeft, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getOrganizationInitials, getOrganizationAvatarGradient } from '@/lib/organization-utils';
import { Badge } from '@/components/ui/badge';

interface OrganizationSettingsLayoutProps {
  organizationId: string;
}

const SETTINGS_NAV = [
  {
    to: '/organization/$organizationId/settings/general',
    label: 'General',
    icon: Settings,
    param: 'general',
    description: 'Name, URL, and organization basics',
    gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    to: '/organization/$organizationId/settings/members',
    label: 'Members',
    icon: Users,
    param: 'members',
    description: 'Team members and roles',
    gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
] as const;

function RoleBadge({ role }: { role: string }) {
  const variant = (() => {
    switch (role) {
      case 'owner':
        return 'default' as const;
      case 'admin':
        return 'info' as const;
      case 'member':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  })();

  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0">
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

export function OrganizationSettingsLayout({ organizationId }: OrganizationSettingsLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const matchRoute = useMatchRoute();

  const {
    data: contextData,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationContext(organizationId);

  const isLoading = orgLoading;

  const organization = contextData?.organization ?? null;
  const currentUserRole = contextData?.userRole ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Failed to load organization settings.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{(orgError as Error).message}</p>
      </div>
    );
  }

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  const visibleNav = SETTINGS_NAV.filter((item) => {
    if (item.param === 'members') return isOwnerOrAdmin;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/organization/$organizationId"
        params={{ organizationId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organization
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-muted/50 p-6 sm:p-8">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          {organization && (
            <div
              className={cn(
                'flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-lg sm:text-xl font-bold shadow-lg',
                'shadow-primary/20',
                getOrganizationAvatarGradient(organization.name),
              )}
            >
              {getOrganizationInitials(organization.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Settings</h1>
            {organization && (
              <p className="text-sm text-muted-foreground mt-1">
                Manage settings for{' '}
                <span className="font-medium text-foreground">{organization.name}</span>
                {currentUserRole && <RoleBadge role={currentUserRole} />}
              </p>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-accent transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Navigation */}
        <nav
          className={cn(
            'flex lg:w-64 shrink-0 flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1 scrollbar-none',
            !mobileMenuOpen && 'hidden lg:flex',
          )}
          aria-label="Settings navigation"
        >
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = matchRoute({
              to: item.to,
              params: { organizationId },
            });

            return (
              <Link
                key={item.param}
                to={item.to}
                params={{ organizationId }}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium whitespace-nowrap',
                  'transition-all duration-200 ease-in-out',
                  isActive
                    ? cn('bg-gradient-to-r shadow-sm border border-border/50', item.gradient)
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                    isActive ? 'bg-primary/10' : 'bg-muted group-hover:bg-muted/80',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors duration-200',
                      isActive
                        ? item.iconColor
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                </div>

                <div className="hidden lg:block">
                  <span className="block leading-tight">{item.label}</span>
                  <span className="block text-xs text-muted-foreground/70 font-normal leading-tight mt-0.5">
                    {item.description}
                  </span>
                </div>
                <span className="lg:hidden">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
