import { Outlet, Link, useMatchRoute } from '@tanstack/react-router';
import { useWorkspaceContext } from '@/hooks/use-workspace-settings';
import { Spinner } from '@/components/ui/spinner';
import { Settings, Palette, Users, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

interface WorkspaceSettingsLayoutProps {
  workspaceId: string;
}

const SETTINGS_NAV = [
  {
    to: '/workspace/$workspaceId/settings/general',
    label: 'General',
    icon: Settings,
    param: 'general',
    description: 'Name, URL, and workspace basics',
    gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    to: '/workspace/$workspaceId/settings/branding',
    label: 'Branding',
    icon: Palette,
    param: 'branding',
    description: 'Logo, colors, and visual identity',
    gradient: 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    to: '/workspace/$workspaceId/settings/members',
    label: 'Members',
    icon: Users,
    param: 'members',
    description: 'Team members and invitations',
    gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    to: '/workspace/$workspaceId/settings/roles',
    label: 'Roles',
    icon: Shield,
    param: 'roles',
    description: 'Roles and permissions',
    gradient: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
] as const;

function getWorkspaceInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const WORKSPACE_AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WORKSPACE_AVATAR_COLORS[Math.abs(hash) % WORKSPACE_AVATAR_COLORS.length];
}

export function WorkspaceSettingsLayout({ workspaceId }: WorkspaceSettingsLayoutProps) {
  const { data, isLoading, error } = useWorkspaceContext(workspaceId);
  const matchRoute = useMatchRoute();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Failed to load workspace settings.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{error.message}</p>
      </div>
    );
  }

  const workspace = data?.workspace;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/workspace/$workspaceId"
        params={{ workspaceId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-muted/50 p-6 sm:p-8">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          {workspace && (
            <div
              className={cn(
                'flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-lg sm:text-xl font-bold shadow-lg',
                'shadow-primary/20',
                getAvatarGradient(workspace.name),
              )}
            >
              {getWorkspaceInitials(workspace.name)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Workspace Settings</h1>
            {workspace && (
              <p className="text-sm text-muted-foreground mt-1">
                Manage settings for{' '}
                <span className="font-medium text-foreground">{workspace.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Navigation */}
        <nav
          className="flex lg:w-64 shrink-0 flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1 scrollbar-none"
          aria-label="Settings navigation"
        >
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = matchRoute({
              to: item.to,
              params: { workspaceId },
            });

            return (
              <Link
                key={item.param}
                to={item.to}
                params={{ workspaceId }}
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
