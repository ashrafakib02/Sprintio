import { useState } from 'react';
import {
  useWorkspaceContext,
  useWorkspaceRoles,
  useUpdateMemberRole,
} from '@/hooks/use-workspace-settings';
import { useAuth } from '@/hooks/use-auth';
import {
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useTransferOwnership,
} from '@/hooks/use-workspace-members';
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
import {
  Users,
  Shield,
  AlertTriangle,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  Mail,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WorkspaceInvitation, WorkspaceContextMember } from '@/lib/api';

interface WorkspaceSettingsMembersProps {
  workspaceId: string;
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

interface MemberRoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    name: string;
    email: string;
    roleName: string;
  } | null;
  workspaceId: string;
}

function MemberRoleChangeDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
}: MemberRoleChangeDialogProps) {
  const { data: rolesData } = useWorkspaceRoles(workspaceId);
  const updateMemberRole = useUpdateMemberRole(workspaceId);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  if (!member) return null;

  const roles = rolesData?.data?.roles ?? [];

  const handleConfirm = () => {
    if (!selectedRoleId || !member) return;
    updateMemberRole.mutate(
      { userId: member.userId, role: selectedRoleId },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role — {member.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  getRoleBadgeColor(member.roleName),
                )}
              >
                Current: {member.roleName}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <span className="text-xs text-muted-foreground">(system)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRoleId && (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                This will update the member's workspace permissions immediately.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedRoleId || updateMemberRole.isPending}>
            {updateMemberRole.isPending ? (
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

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  roles: Array<{ id: string; name: string; isSystem: boolean }>;
}

function InviteMemberDialog({ open, onOpenChange, workspaceId, roles }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState('member');
  const inviteMember = useInviteMember(workspaceId);

  const filteredRoles = roles.filter((r) => r.name.toLowerCase() !== 'owner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember.mutate(
      { email, role: roleName },
      {
        onSuccess: () => {
          setEmail('');
          setRoleName('member');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={roleName} onValueChange={setRoleName}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name.toLowerCase()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              An invitation link will be generated for the member to join.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || inviteMember.isPending}>
              {inviteMember.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RemoveMemberConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  member: { userId: string; name: string; email: string } | null;
}

function RemoveMemberConfirmDialog({
  open,
  onOpenChange,
  workspaceId,
  member,
}: RemoveMemberConfirmDialogProps) {
  const removeMember = useRemoveMember(workspaceId);
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
            Are you sure you want to remove <strong>{member.name}</strong> from this workspace?
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">
            This action cannot be undone. The member will lose access to all workspace resources.
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

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

function TransferOwnershipDialog({
  open,
  onOpenChange,
  workspaceId,
}: TransferOwnershipDialogProps) {
  const { data: contextData } = useWorkspaceContext(workspaceId);
  const { user } = useAuth();
  const transferOwnership = useTransferOwnership(workspaceId);
  const [selectedUserId, setSelectedUserId] = useState('');
  const workspaceMembers = contextData?.members || [];
  const otherMembers = workspaceMembers.filter(
    (m: WorkspaceContextMember) => m.userId !== user?.id,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    transferOwnership.mutate(selectedUserId, {
      onSuccess: () => {
        setSelectedUserId('');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>Transfer workspace ownership to another member.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>Warning:</strong> This action cannot be undone. You will become an admin and the
            selected member will become the workspace owner.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-owner">Transfer to</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="new-owner">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {otherMembers.map((m: WorkspaceContextMember) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email || m.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!selectedUserId || transferOwnership.isPending}
            >
              {transferOwnership.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Ownership
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PendingInvitationsProps {
  workspaceId: string;
}

function PendingInvitations({ workspaceId }: PendingInvitationsProps) {
  const { data, isLoading, error } = useWorkspaceInvitations(workspaceId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading) return null;

  if (error) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <p className="text-sm">Failed to load invitations</p>
        <p className="text-xs mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  const invitations = data || [];
  if (invitations.length === 0) return null;

  const copyInviteLink = async (invitationId: string) => {
    const url = `${window.location.origin}/invitations/accept?token=${invitationId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle headingLevel="h3" className="text-lg flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {invitations.map((invitation: WorkspaceInvitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between rounded-md px-3 py-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    invitation.role === 'admin'
                      ? 'info'
                      : invitation.role === 'guest'
                        ? 'secondary'
                        : 'default'
                  }
                >
                  {invitation.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyInviteLink(invitation.id)}
                  className="h-7 gap-1 text-xs"
                >
                  {copiedId === invitation.id ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkspaceSettingsMembers({ workspaceId }: WorkspaceSettingsMembersProps) {
  const { data, isLoading, error } = useWorkspaceContext(workspaceId);
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useWorkspaceRoles(workspaceId);

  const workspace = data?.workspace;
  const userRole = data?.userRole;
  const canManage = userRole === 'owner' || userRole === 'admin';

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    userId: string;
    name: string;
    email: string;
    roleName: string;
  } | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    name: string;
    email: string;
  } | null>(null);

  if (isLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error || rolesError) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Failed to load workspace members</p>
        <p className="text-xs mt-1 opacity-70">{error?.message ?? rolesError?.message}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Workspace not found</p>
      </div>
    );
  }

  const members = data?.members ?? [];
  const roles = rolesData?.data?.roles ?? [];

  const ROLE_VARIANT: Record<string, 'warning' | 'info' | 'default' | 'secondary'> = {
    owner: 'warning',
    admin: 'info',
    member: 'default',
    guest: 'secondary',
  };

  const openRoleDialog = (member: WorkspaceContextMember) => {
    setSelectedMember({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      roleName: member.role,
    });
    setRoleDialogOpen(true);
  };

  const openRemoveDialog = (member: WorkspaceContextMember) => {
    setRemoveTarget({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
    });
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
              Manage member roles and permissions. {members.length} member
              {members.length !== 1 ? 's' : ''} in this workspace.
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No members in this workspace yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Member</span>
                <span>Role & Actions</span>
              </div>

              {/* Member Rows */}
              {members.map((member: WorkspaceContextMember) => {
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
                        {member.user.name?.charAt(0)?.toUpperCase() ??
                          member.user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user.email}
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
                                aria-label={`Remove ${member.user.name}`}
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

      {/* Pending Invitations */}
      {canManage && <PendingInvitations workspaceId={workspaceId} />}

      {/* Transfer Ownership (owner only) */}
      {userRole === 'owner' && (
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h3" className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              Transfer Ownership
            </CardTitle>
            <CardDescription>
              Transfer workspace ownership to another member. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Roles Info Card */}
      {canManage && roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h3" className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Available Roles
            </CardTitle>
            <CardDescription>These roles can be assigned to workspace members.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={ROLE_VARIANT[role.name.toLowerCase()] ?? 'default'}>
                      {role.name}
                    </Badge>
                    {role.isSystem && <span className="text-xs text-muted-foreground">System</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {role.permissions.length} permission
                    {role.permissions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <MemberRoleChangeDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        member={selectedMember}
        workspaceId={workspaceId}
      />
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={workspaceId}
        roles={roles}
      />
      <RemoveMemberConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        workspaceId={workspaceId}
        member={removeTarget}
      />
      <TransferOwnershipDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
