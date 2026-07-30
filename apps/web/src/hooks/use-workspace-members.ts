import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWorkspaceMembers,
  listWorkspaceInvitations,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  acceptInvitation,
  rejectInvitation,
  transferOwnership,
  switchWorkspace,
  type WorkspaceMember,
  type WorkspaceInvitation,
  type WorkspaceContextMember,
  type WorkspaceSettingsData,
} from '@/lib/api';
import { WORKSPACE_LIST_QUERY_KEY } from '@/hooks/use-workspace-settings';
import { toast } from 'sonner';

// ── Internal Types ──────────────────────────────────────────

interface WorkspaceContextRawResponse {
  data: {
    workspace: WorkspaceSettingsData;
    userRole: string;
    members: WorkspaceContextMember[];
    memberCount?: number;
  };
}

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const WORKSPACE_MEMBERS_QUERY_KEY = (workspaceId: string) =>
  ['workspace', workspaceId, 'members'] as const;

export const WORKSPACE_INVITATIONS_QUERY_KEY = (workspaceId: string) =>
  ['workspace', workspaceId, 'invitations'] as const;

export const WORKSPACE_CONTEXT_QUERY_KEY = (workspaceId: string) =>
  ['workspace', workspaceId, 'context'] as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all members of a workspace.
 * Returns the unwrapped `WorkspaceMember[]` array via a `select` transform.
 */
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
    queryFn: () => listWorkspaceMembers(workspaceId),
    select: (response) => response.data.members,
    staleTime: 30_000,
  });
}

/**
 * Fetch all pending invitations for a workspace.
 * Returns the unwrapped `WorkspaceInvitation[]` array via a `select` transform.
 */
export function useWorkspaceInvitations(workspaceId: string) {
  return useQuery({
    queryKey: WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
    queryFn: () => listWorkspaceInvitations(workspaceId),
    select: (response) => response.data.invitations,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Invite a member to a workspace.
 *
 * Optimistically adds a temporary invitation to the invitations cache so the
 * UI reflects the pending invite immediately.  Invalidates both invitations
 * **and** context queries on settlement because the new member will change the
 * workspace member count once the invite is accepted.
 */
export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      inviteWorkspaceMember(workspaceId, data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
      });

      const previousInvitations = queryClient.getQueryData<WorkspaceInvitation[]>(
        WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
      );

      queryClient.setQueryData<WorkspaceInvitation[]>(
        WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
        (old) => [
          ...(old ?? []),
          {
            id: `temp-${Date.now()}`,
            workspaceId,
            email: data.email,
            role: data.role as WorkspaceInvitation['role'],
            invitedById: '',
            status: 'pending' as const,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      );

      return { previousInvitations };
    },

    onError: (_error: Error, _data, context) => {
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
          context.previousInvitations,
        );
      }
      toast.error('Failed to send invitation', { description: _error.message });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: WORKSPACE_INVITATIONS_QUERY_KEY(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
      });
    },
  });
}

/**
 * Remove a member from a workspace.
 *
 * Optimistically removes the member from both the members list and the
 * workspace context cache.  On settlement both caches are invalidated.
 */
export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeWorkspaceMember(workspaceId, userId),

    onMutate: async (userId) => {
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
      });
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
      });

      const previousMembers = queryClient.getQueryData<WorkspaceMember[]>(
        WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
      );
      const previousContext = queryClient.getQueryData(
        WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
      );

      queryClient.setQueryData<WorkspaceMember[]>(
        WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
        (old) => old?.filter((m) => m.userId !== userId) ?? [],
      );

      queryClient.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY(workspaceId), (old: WorkspaceContextRawResponse) =>
        old?.data?.memberCount != null
          ? { ...old, data: { ...old.data, memberCount: old.data.memberCount - 1 } }
          : old,
      );

      return { previousMembers, previousContext };
    },

    onError: (_error: Error, _userId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
          context.previousMembers,
        );
      }
      if (context?.previousContext) {
        queryClient.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY(workspaceId), context.previousContext);
      }
      toast.error('Failed to remove member', { description: _error.message });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
      });
    },
  });
}

/**
 * Accept a workspace invitation.
 *
 * Keeps the broad invalidation (`['workspace']` prefix) so all workspace-
 * scoped data is refreshed after the user joins.  Optimistically removes the
 * matching invitation from the invitations cache when query data is available.
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => acceptInvitation(token),

    onMutate: async (token) => {
      // Best-effort optimistic removal across all cached invitation lists.
      // We don't know which workspaceId this token belongs to, so iterate.
      const queries = queryClient.getQueriesData<WorkspaceInvitation[]>({
        queryKey: ['workspace'],
      });

      for (const [key, data] of queries) {
        if (!Array.isArray(data)) continue;

        const idx = data.findIndex((inv) => inv.id === token);
        if (idx !== -1) {
          queryClient.setQueryData<WorkspaceInvitation[]>(key, [
            ...data.slice(0, idx),
            ...data.slice(idx + 1),
          ]);
        }
      }
    },

    onError: (error: Error) => {
      toast.error('Failed to accept invitation', { description: error.message });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Invitation accepted! You are now a member.');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
}

/**
 * Reject a workspace invitation.
 *
 * Optimistically removes the matching invitation from all cached invitation
 * lists.  Invalidates invitations queries on settlement to stay consistent
 * with the server.  Rolls back on error.
 */
export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => rejectInvitation(token),

    onMutate: async (token) => {
      const queries = queryClient.getQueriesData<WorkspaceInvitation[]>({
        queryKey: ['workspace'],
      });

      const snapshots: Array<[readonly unknown[], WorkspaceInvitation[]]> = [];

      for (const [key, data] of queries) {
        if (!Array.isArray(data)) continue;
        snapshots.push([key, data]);

        const idx = data.findIndex((inv) => inv.id === token);
        if (idx !== -1) {
          queryClient.setQueryData<WorkspaceInvitation[]>(key, [
            ...data.slice(0, idx),
            ...data.slice(idx + 1),
          ]);
        }
      }

      return { snapshots };
    },

    onError: (_error: Error, _token, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to reject invitation', { description: _error.message });
    },

    onSuccess: () => {
      toast.success('Invitation rejected');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workspace'],
      });
    },
  });
}

/**
 * Switch to a workspace - validates membership and returns workspace context.
 * Used by the workspace switcher to validate and fetch workspace data.
 */
export function useSwitchWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => switchWorkspace(workspaceId),
    onSuccess: (response) => {
      const { workspace, userRole, members } = response.data;

      // Update the workspace context cache with the new workspace data
      queryClient.setQueryData(
        WORKSPACE_CONTEXT_QUERY_KEY(workspaceId),
        {
          workspace,
          userRole,
          members,
        },
      );

      // Invalidate the workspace list to refresh the switcher
      queryClient.invalidateQueries({ queryKey: WORKSPACE_LIST_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error('Failed to switch workspace', { description: error.message });
    },
  });
}
