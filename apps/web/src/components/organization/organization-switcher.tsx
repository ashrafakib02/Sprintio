import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations, useCreateOrganization } from '@/hooks/use-organization';
import {
  ORGANIZATION_CONTEXT_QUERY_KEY,
  ORGANIZATION_MEMBERS_QUERY_KEY,
} from '@/hooks/use-organization-settings';
import { getOrganizationInitials, getOrganizationAvatarGradient } from '@/lib/organization-utils';
import { getStoredOrganizationId, setStoredOrganizationId } from '@/lib/organization-storage';
import { clearStoredWorkspaceId } from '@/lib/workspace-storage';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { ChevronDown, Check, Plus, Building2, Search } from 'lucide-react';
// ── Helpers ─────────────────────────────────────────────────

function extractOrganizationId(pathname: string): string | null {
  const match = pathname.match(/\/organization\/([^/]+)/);
  return match?.[1] ?? null;
}

// ── Component ───────────────────────────────────────────────

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listboxId = 'organization-switcher-listbox';

  const { data: organizations, isLoading } = useOrganizations();
  const createOrganization = useCreateOrganization();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const urlOrgId = extractOrganizationId(pathname);
  const activeOrganizationId = useMemo(() => {
    if (urlOrgId) return urlOrgId;
    const stored = getStoredOrganizationId();
    if (stored) return stored;
    if (organizations && organizations.length > 0) {
      setStoredOrganizationId(organizations[0].id);
      return organizations[0].id;
    }
    return null;
  }, [urlOrgId, organizations]);

  const activeOrganization = organizations?.find((org) => org.id === activeOrganizationId);
  const displayOrganizations = organizations ?? [];

  // ── Filtered organizations ────────────────────────────────

  const filteredOrganizations = useMemo(() => {
    if (!search.trim()) return displayOrganizations;
    const q = search.toLowerCase();
    return displayOrganizations.filter(
      (org) => org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q),
    );
  }, [displayOrganizations, search]);

  // ── Click outside to close ────────────────────────────────

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch('');
      setActiveIndex(-1);
    } else if (containerRef.current?.contains(e.target as Node)) {
      // Click inside container — if it's not on the trigger button, close
      const triggerButton = containerRef.current.querySelector('button');
      // Don't close when clicking the "Create organization" button —
      // its own onClick handler manages the dialog state.
      const target = e.target as HTMLElement;
      if (
        triggerButton &&
        !triggerButton.contains(e.target as Node) &&
        !target.closest('[data-create-org]') &&
        !target.closest('[role="option"]')
      ) {
        setOpen(false);
        setSearch('');
        setActiveIndex(-1);
      }
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

  // ── Keyboard support ──────────────────────────────────────

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

  // Focus search input when dropdown opens, or listbox if no search
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        } else if (listboxRef.current) {
          listboxRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keep focus on the listbox when clicking inside it,
  // so keyboard navigation (ArrowDown/Up/Enter) keeps working.
  useEffect(() => {
    const el = listboxRef.current;
    if (!open || !el) return;
    const refocus = () => {
      // If focus left the listbox (e.g. clicking an option), bring it back
      if (document.activeElement !== el && el.contains(document.activeElement) === false) {
        el.focus();
      }
    };
    el.addEventListener('mouseup', refocus);
    el.addEventListener('click', refocus);
    return () => {
      el.removeEventListener('mouseup', refocus);
      el.removeEventListener('click', refocus);
    };
  }, [open]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  // ── Select organization ───────────────────────────────────

  const handleSelect = useCallback(
    async (organizationId: string) => {
      if (organizationId === activeOrganizationId) {
        setOpen(false);
        setSearch('');
        return;
      }

      // Invalidate context so pages get fresh data
      await queryClient.invalidateQueries({
        queryKey: ORGANIZATION_CONTEXT_QUERY_KEY(organizationId),
      });
      await queryClient.invalidateQueries({
        queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(organizationId),
      });

      setOpen(false);
      setSearch('');

      // Clear workspace — it belongs to the old org
      clearStoredWorkspaceId();

      navigate({
        to: '/organization/$organizationId',
        params: { organizationId },
      });
      setStoredOrganizationId(organizationId);
    },
    [activeOrganizationId, navigate, queryClient],
  );

  // ── Create organization ───────────────────────────────────

  const handleCreate = useCallback(() => {
    setOpen(false);
    setSearch('');
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newOrgName.trim();
      if (!name) return;

      createOrganization.mutate(
        { name },
        {
          onSuccess: (response) => {
            setCreateDialogOpen(false);
            setNewOrgName('');
            navigate({
              to: '/organization/$organizationId',
              params: { organizationId: response.data.organization.id },
            });
            setStoredOrganizationId(response.data.organization.id);
          },
        },
      );
    },
    [newOrgName, createOrganization, navigate],
  );

  // ── Loading state ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  // ── No organizations state ────────────────────────────────

  if (displayOrganizations.length === 0) {
    return (
      <div ref={containerRef}>
        <button
          type="button"
          onClick={handleCreate}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create an organization
        </button>
        <CreateOrganizationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSubmit}
          name={newOrgName}
          onNameChange={setNewOrgName}
          isPending={createOrganization.isPending}
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Live region for screen readers */}
      <span className="sr-only" role="status" aria-live="polite" />

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
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={`Current organization: ${activeOrganization?.name ?? 'None selected'}`}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
          open && 'bg-accent text-accent-foreground',
        )}
      >
        {/* Avatar */}
        {activeOrganization ? (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white',
              getOrganizationAvatarGradient(activeOrganization.name),
            )}
          >
            {getOrganizationInitials(activeOrganization.name)}
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Name */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="truncate">{activeOrganization?.name ?? 'Select organization'}</span>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label="Organizations"
          aria-activedescendant={activeIndex >= 0 ? `org-option-${activeIndex}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((prev) => (prev < filteredOrganizations.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOrganizations.length - 1));
            } else if (e.key === 'Enter' && activeIndex >= 0) {
              e.preventDefault();
              const org = filteredOrganizations[activeIndex];
              if (org) handleSelect(org.id);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActiveIndex(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setActiveIndex(filteredOrganizations.length - 1);
            }
          }}
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {/* Search */}
          {displayOrganizations.length > 3 && (
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search organizations..."
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

          {/* Organization list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOrganizations.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No organizations found
              </div>
            ) : (
              filteredOrganizations.map((org, idx) => {
                const isActive = org.id === activeOrganizationId;

                return (
                  <button
                    key={org.id}
                    id={`org-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => handleSelect(org.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground',
                    )}
                  >
                    {/* Organization Avatar */}
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[10px] font-bold text-white',
                        getOrganizationAvatarGradient(org.name),
                      )}
                    >
                      {getOrganizationInitials(org.name)}
                    </div>

                    {/* Organization Name & Slug */}
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="flex-1 truncate">{org.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{org.slug}</span>
                    </div>

                    {/* Active indicator */}
                    {isActive ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-2" />

          {/* Create organization option */}
          <div className="p-1">
            <button
              type="button"
              data-create-org
              onClick={handleCreate}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors',
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span>Create organization</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
        name={newOrgName}
        onNameChange={setNewOrgName}
        isPending={createOrganization.isPending}
      />
    </div>
  );
}

// ── Create Organization Dialog ──────────────────────────────

function CreateOrganizationDialog({
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
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium mb-1.5">
              Organization name
            </label>
            <input
              id="org-name"
              type="text"
              placeholder="e.g. My Company"
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
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
                'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                'transition-colors disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'transition-colors disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {isPending && <Spinner className="h-4 w-4 mr-2" />}
              Create
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
