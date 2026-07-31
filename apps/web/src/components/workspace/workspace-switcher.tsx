import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useListWorkspaces, useCreateWorkspace } from '@/hooks/use-workspace';
import { WORKSPACE_CONTEXT_QUERY_KEY } from '@/hooks/use-workspace-settings';
import { switchWorkspace } from '@/lib/api';
import { getWorkspaceInitials, getAvatarGradient } from '@/lib/workspace-utils';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { ChevronDown, Check, Plus, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkspaceSettingsData } from '@/lib/api';
import type { WorkspaceRole } from '@sprintio/shared';

// ── Helpers ─────────────────────────────────────────────────

function extractWorkspaceId(pathname: string): string | null {
  const match = pathname.match(/\/workspace\/([^/]+)/);
  return match?.[1] ?? null;
}

function formatPlan(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ── Role Badge ──────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const variant = useMemo(() => {
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
  }, [role]);

  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0">
      {formatPlan(role)}
    </Badge>
  );
}

// ── Workspace Context Fetcher ───────────────────────────────
// Prefetches workspace context for visible workspaces so we can show roles

function useWorkspaceRoleCache(workspaces: WorkspaceSettingsData[]) {
  const queryClient = useQueryClient();

  // Prefetch context for each workspace on mount
  useEffect(() => {
    for (const ws of workspaces) {
      queryClient.prefetchQuery({
        queryKey: WORKSPACE_CONTEXT_QUERY_KEY(ws.id),
        queryFn: () =>
          import('@/lib/api').then((api) =>
            api.getWorkspaceContext(ws.id).then((res) => ({
              workspace: res.data.workspace,
              userRole: res.data.userRole,
              members: res.data.members,
            })),
          ),
        staleTime: 60_000,
      });
    }
  }, [workspaces, queryClient]);

  return (workspaceId: string) => {
    const data = queryClient.getQueryData<{
      userRole: WorkspaceRole;
    }>(WORKSPACE_CONTEXT_QUERY_KEY(workspaceId));
    return data?.userRole;
  };
}

// ── Component ───────────────────────────────────────────────

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listboxId = 'workspace-switcher-listbox';

  const { data: workspaces, isLoading } = useListWorkspaces();
  const createWorkspace = useCreateWorkspace();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeWorkspaceId = extractWorkspaceId(pathname);

  const activeWorkspace = workspaces?.find((ws) => ws.id === activeWorkspaceId);
  const displayWorkspaces = workspaces ?? [];

  // Get role for each workspace from cache
  const getRole = useWorkspaceRoleCache(displayWorkspaces);

  // ── Filtered workspaces ─────────────────────────────────

  const filteredWorkspaces = useMemo(() => {
    if (!search.trim()) return displayWorkspaces;
    const q = search.toLowerCase();
    return displayWorkspaces.filter(
      (ws) => ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q),
    );
  }, [displayWorkspaces, search]);

  // ── Click outside to close ──────────────────────────────

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch('');
      setActiveIndex(-1);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleClickOutside]);

  // ── Keyboard support ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
        setActiveIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  // ── Select workspace ────────────────────────────────────

  const handleSelect = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeWorkspaceId) {
        setOpen(false);
        setSearch('');
        return;
      }

      setSwitchingTo(workspaceId);

      try {
        // Call switchWorkspace API to validate and set the active workspace server-side
        await switchWorkspace(workspaceId);

        // Invalidate the workspace context for the new workspace so pages get fresh data
        await queryClient.invalidateQueries({
          queryKey: WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
        });

        // Also invalidate the workspace list in case anything changed
        await queryClient.invalidateQueries({
          queryKey: ['workspaces'],
        });

        setOpen(false);
        setSearch('');

        // Navigate to the new workspace
        navigate({
          to: '/workspace/$workspaceId',
          params: { workspaceId },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';

        if (
          msg.includes('CSRF_MISSING_HEADER') ||
          msg.includes('CSRF_ORIGIN_MISMATCH') ||
          msg.includes('CSRF validation failed')
        ) {
          toast.error('Session validation failed', {
            description: 'A security check failed. Please refresh the page and try again.',
          });
        } else {
          toast.error('Failed to switch workspace', {
            description: msg || 'Please try again',
          });
        }
      } finally {
        setSwitchingTo(null);
      }
    },
    [activeWorkspaceId, navigate, queryClient],
  );

  // ── Create workspace ────────────────────────────────────

  const handleCreate = useCallback(() => {
    setOpen(false);
    setSearch('');
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newWorkspaceName.trim();
      if (!name) return;

      createWorkspace.mutate(
        { name },
        {
          onSuccess: (response) => {
            setCreateDialogOpen(false);
            setNewWorkspaceName('');
            // Navigate to the newly created workspace
            navigate({
              to: '/workspace/$workspaceId',
              params: { workspaceId: response.data.workspace.id },
            });
          },
        },
      );
    },
    [newWorkspaceName, createWorkspace, navigate],
  );

  // ── Loading state ───────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading workspaces...</span>
      </div>
    );
  }

  // ── No workspaces state ─────────────────────────────────

  if (displayWorkspaces.length === 0) {
    return (
      <button
        type="button"
        onClick={handleCreate}
        className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create a workspace
      </button>
    );
  }

  // ── Render ──────────────────────────────────────────────

  const isSwitching = switchingTo !== null;

  return (
    <div ref={containerRef} className="relative">
      {/* Live region for screen readers */}
      <span className="sr-only" role="status" aria-live="polite">
        {isSwitching ? 'Switching workspace…' : ''}
      </span>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (open) {
            setSearch('');
            setActiveIndex(-1);
          }
        }}
        disabled={isSwitching}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={`Current workspace: ${activeWorkspace?.name ?? 'None selected'}`}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
          open && 'bg-accent text-accent-foreground',
          isSwitching && 'opacity-70 pointer-events-none',
        )}
      >
        {/* Avatar */}
        {activeWorkspace ? (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white',
              getAvatarGradient(activeWorkspace.name),
            )}
          >
            {getWorkspaceInitials(activeWorkspace.name)}
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Name & Role */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="truncate">
            {isSwitching ? 'Switching...' : (activeWorkspace?.name ?? 'Select workspace')}
          </span>
          {activeWorkspace && !isSwitching && getRole(activeWorkspace.id) && (
            <RoleBadge role={getRole(activeWorkspace.id)!} />
          )}
        </div>

        {/* Spinner or Chevron */}
        {isSwitching ? (
          <Spinner className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Workspaces"
          aria-busy={isSwitching}
          aria-activedescendant={activeIndex >= 0 ? `ws-option-${activeIndex}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((prev) => (prev < filteredWorkspaces.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredWorkspaces.length - 1));
            } else if (e.key === 'Enter' && activeIndex >= 0) {
              e.preventDefault();
              const ws = filteredWorkspaces[activeIndex];
              if (ws) handleSelect(ws.id);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActiveIndex(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setActiveIndex(filteredWorkspaces.length - 1);
            }
          }}
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {/* Search */}
          {displayWorkspaces.length > 3 && (
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search workspaces..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(
                    'w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  )}
                />
              </div>
            </div>
          )}

          {/* Workspace list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredWorkspaces.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No workspaces found
              </div>
            ) : (
              filteredWorkspaces.map((workspace, idx) => {
                const isActive = workspace.id === activeWorkspaceId;
                const isCurrentlySwitching = workspace.id === switchingTo;
                const role = getRole(workspace.id);

                return (
                  <button
                    key={workspace.id}
                    id={`ws-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={isCurrentlySwitching}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => handleSelect(workspace.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground',
                      isCurrentlySwitching && 'opacity-60 pointer-events-none',
                    )}
                  >
                    {/* Workspace Avatar */}
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[10px] font-bold text-white',
                        getAvatarGradient(workspace.name),
                      )}
                    >
                      {getWorkspaceInitials(workspace.name)}
                    </div>

                    {/* Workspace Name & Role */}
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="flex-1 truncate">{workspace.name}</span>
                      {role && <RoleBadge role={role} />}
                    </div>

                    {/* Active indicator or spinner */}
                    {isCurrentlySwitching ? (
                      <Spinner className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-2" />

          {/* Create workspace option */}
          <div className="p-1">
            <button
              type="button"
              onClick={handleCreate}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors',
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span>Create workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
        name={newWorkspaceName}
        onNameChange={setNewWorkspaceName}
        isPending={createWorkspace.isPending}
      />
    </div>
  );
}

// ── Create Workspace Dialog ─────────────────────────────────

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSubmit,
  name,
  onNameChange,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  onNameChange: (value: string) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="workspace-name" className="block text-sm font-medium mb-1.5">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              placeholder="e.g. My Team"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              autoFocus
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
