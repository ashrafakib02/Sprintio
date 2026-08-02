import { useState, useMemo } from 'react';
import {
  useOrganizationContext,
  useOrganizationMembers,
  useAddOrganizationMember,
  useRemoveOrganizationMember,
  useUpdateOrganizationMemberRole,
} from '@/hooks/use-organization-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, Shield, AlertTriangle, UserPlus, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OrganizationMember } from '@/types/organization';
import type { OrganizationRole } from '@sprintio/shared';

interface OrganizationSettingsMembersProps {
  organizationId: string;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  owner:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  admin:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  member:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  guest:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
};

function getRoleBadgeColor(roleName: string): string {
  const normalized = roleName.toLowerCase();
  return (
    ROLE_BADGE_COLORS[normalized] ??
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
  );
}

const ROLE_VARIANT: Record<string, 'warning' | 'info' | 'default' | 'secondary'> = {
  owner: 'warning',
  admin: 'info',
  member: 'default',
  guest: 'secondary',
};

const ORGANIZATION_ROLES: OrganizationRole[] = ['owner', 'admin', 'member', 'guest'];

// ── Role Change Dialog ──────────────────────────────────────

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  organizationId: string;
}

function RoleChangeDialog({ open, onOpenChange, member, organizationId }: RoleChangeDialogProps) {
  const updateRole = useUpdateOrganizationMemberRole(organizationId);
  const [selectedRole, setSelectedRole] = useState<string>('');

  if (!member) return null;

  const handleConfirm = () => {
    if (!selectedRole) return;
    updateRole.mutate(
      { userId: member.userId, role: selectedRole as OrganizationRole },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role &mdash; {member.user?.name || 'Member'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">{member.user?.name || 'Unnamed'}</p>
            <p className="text-xs text-muted-foreground">{member.user?.email}</p>
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  getRoleBadgeColor(member.role),
                )}
              >
                Current: {member.role}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole && (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                This will update the member&apos;s organization permissions immediately.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedRole || updateRole.isPending}>
            {updateRole.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Updating...
              </>
            ) : (
              'Change Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Member Dialog ───────────────────────────────────────

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

function AddMemberDialog({ open, onOpenChange, organizationId }: AddMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('member');
  const addMember = useAddOrganizationMember(organizationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMember.mutate(
      { email, role },
      {
        onSuccess: () => {
          setEmail('');
          setRole('member');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>Add a new member to this organization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="add-member-email">Email address</Label>
            <Input
              id="add-member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-member-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrganizationRole)}>
              <SelectTrigger id="add-member-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_ROLES.filter((r) => r !== 'owner').map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Members can be assigned roles to control their permissions.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || addMember.isPending}>
              {addMember.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Remove Member Confirm Dialog ────────────────────────────

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  member: OrganizationMember | null;
}

function RemoveMemberDialog({
  open,
  onOpenChange,
  organizationId,
  member,
}: RemoveMemberDialogProps) {
  const removeMember = useRemoveOrganizationMember(organizationId);
  if (!member) return null;

  const handleConfirm = () => {
    removeMember.mutate(member.userId, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remove Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{member.user?.name || 'this member'}</strong>{' '}
            from this organization?
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">
            This action cannot be undone. The member will lose access to all organization resources.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={removeMember.isPending}>
            {removeMember.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Removing...
              </>
            ) : (
              'Remove Member'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────

export function OrganizationSettingsMembers({ organizationId }: OrganizationSettingsMembersProps) {
  const {
    data: contextData,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationContext(organizationId);

  const organization = contextData?.organization ?? null;

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useOrganizationMembers(organizationId);

  // TODO: Derive userRole from membership context
  const userRole = 'owner';
  const canManage = userRole === 'owner' || userRole === 'admin';

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const members = useMemo(() => {
    if (!membersData) return [];
    let filtered = membersData;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((m) => m.role === roleFilter);
    }

    return filtered;
  }, [membersData, searchQuery, roleFilter]);

  if (orgLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (orgError || membersError) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Failed to load organization members</p>
        <p className="text-xs mt-1 opacity-70">{(orgError ?? membersError)?.message}</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Organization not found</p>
      </div>
    );
  }

  const allMembers = membersData ?? [];

  const openRoleDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    setRoleDialogOpen(true);
  };

  const openRemoveDialog = (member: OrganizationMember) => {
    setRemoveTarget(member);
    setRemoveDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Member Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle headingLevel="h2" className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Member Management
            </CardTitle>
            <CardDescription>
              Manage member roles and permissions. {allMembers.length} member
              {allMembers.length !== 1 ? 's' : ''} in this organization.
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setAddMemberOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Search + Role Filter */}
          {allMembers.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ORGANIZATION_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {allMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No members in this organization yet.</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No members match your search.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Member</span>
                <span>Role &amp; Actions</span>
              </div>

              {/* Member Rows */}
              {members.map((member) => {
                const isOwner = member.role.toLowerCase() === 'owner';
                const canEditThis = canManage && !isOwner;

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between rounded-md px-3 py-3 hover:bg-accent/50 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {member.user?.name?.charAt(0)?.toUpperCase() ??
                          member.user?.email?.charAt(0)?.toUpperCase() ??
                          '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user?.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>

                    {/* Role Badge + Actions */}
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_VARIANT[member.role.toLowerCase()] ?? 'default'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {member.role}
                      </Badge>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          {canEditThis && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRoleDialog(member)}
                                className="text-xs"
                              >
                                Change Role
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => openRemoveDialog(member)}
                                aria-label={`Remove ${member.user?.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {isOwner && (
                            <span className="text-xs text-muted-foreground italic px-2">Owner</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RoleChangeDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        member={selectedMember}
        organizationId={organizationId}
      />
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        organizationId={organizationId}
      />
      <RemoveMemberDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        organizationId={organizationId}
        member={removeTarget}
      />
    </div>
  );
}
