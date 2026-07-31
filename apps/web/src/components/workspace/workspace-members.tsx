import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useTransferOwnership,
} from '@/hooks/use-workspace-members';
import { useWorkspaceContext } from '@/hooks/use-workspace-settings';
import type { WorkspaceMember, WorkspaceInvitation, WorkspaceContextMember } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  UserPlus,
  Mail,
  Trash2,
  ArrowRightLeft,
  Crown,
  Shield,
  User,
  Eye,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

interface WorkspaceMembersProps {
  workspaceId: string;
}

const ROLE_CONFIG = {
  owner: { label: 'Owner', variant: 'warning' as const, icon: Crown },
  admin: { label: 'Admin', variant: 'info' as const, icon: Shield },
  member: { label: 'Member', variant: 'default' as const, icon: User },
  guest: { label: 'Guest', variant: 'secondary' as const, icon: Eye },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.member;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ── Invite Member Dialog ──────────────────────────────────────

function InviteMemberDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const inviteMember = useInviteMember(workspaceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember.mutate(
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
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transfer Ownership Dialog ─────────────────────────────────

function TransferOwnershipDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
        </DialogHeader>

        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>Warning:</strong> This action cannot be undone. You will become an admin and the
            selected member will become the workspace owner.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={transferOwnership.isPending || !selectedUserId}
            >
              {transferOwnership.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Invitation Token Display ──────────────────────────────────

function InvitationTokenDisplay({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copyToken = async () => {
    const acceptUrl = `${window.location.origin}/invitations/accept?token=${token}`;
    await navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={copyToken} className="h-7 gap-1 text-xs">
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy Link
        </>
      )}
    </Button>
  );
}

// ── Main Component ────────────────────────────────────────────

export function WorkspaceMembers({ workspaceId }: WorkspaceMembersProps) {
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorMsg,
  } = useWorkspaceMembers(workspaceId);
  const { data: contextData } = useWorkspaceContext(workspaceId);
  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    isError: invitationsError,
    error: invitationsErrorMsg,
  } = useWorkspaceInvitations(workspaceId);
  const { user } = useAuth();
  const removeMember = useRemoveMember(workspaceId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const members = membersData || [];
  const workspaceMembers = contextData?.members || [];
  const invitations = invitationsData || [];
  const currentUserMember = members.find((m: WorkspaceMember) => m.userId === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin' || isOwner;

  if (membersLoading || invitationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (membersError || invitationsError) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Failed to load members</p>
        <p className="text-xs mt-1 opacity-70">
          {membersErrorMsg?.message ?? invitationsErrorMsg?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Members Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle headingLevel="h2" className="text-xl">
              Members
            </CardTitle>
            <CardDescription className="mt-1">
              {members.length} {members.length === 1 ? 'member' : 'members'} in this workspace
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </Button>
              )}
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <User className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">No members yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {workspaceMembers.map((member: WorkspaceContextMember) => {
                const isCurrentUser = member.userId === user?.id;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.user?.name ?? member.userId} size="default" />
                      <div>
                        <p className="text-sm font-medium">
                          {member.user?.name || 'Unnamed User'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={member.role} />
                      {isAdmin && !isCurrentUser && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember.mutate(member.userId)}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card */}
      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h3" className="text-lg">
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {invitations.map((invitation: WorkspaceInvitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={invitation.role} />
                    <InvitationTokenDisplay token={invitation.id} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteMemberDialog
        workspaceId={workspaceId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <TransferOwnershipDialog
        workspaceId={workspaceId}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}
