import { useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useWorkspaceContext, useWorkspaceRoles, usePermissions } from './use-workspace-settings';
import { useWorkspaceMembers, useWorkspaceInvitations } from './use-workspace-members';
import {
  setActiveTab,
  toggleSidebar,
  setSidebarCollapsed,
  selectMember,
  openInviteDialog,
  closeInviteDialog,
  setInviteDialogOpen,
  openRoleDialog,
  closeRoleDialog,
  setMemberSearch,
  setMemberRoleFilter,
  resetWorkspaceUI,
} from '@/store/slices/workspaceSlice';
import type { WorkspaceSettingsTab } from '@/types/workspace';
import type { WorkspaceRole } from '@sprintio/shared';

/**
 * Single entry point for workspace settings pages.
 * Combines Redux UI state with TanStack Query server data.
 */
export function useWorkspaceState(workspaceId: string) {
  const dispatch = useAppDispatch();

  // ─── Redux UI State ──────────────────────────────────────────────────
  const activeTab = useAppSelector((s) => s.workspace.activeTab);
  const sidebarCollapsed = useAppSelector((s) => s.workspace.sidebarCollapsed);
  const selectedMemberId = useAppSelector((s) => s.workspace.selectedMemberId);
  const inviteDialogOpen = useAppSelector((s) => s.workspace.inviteDialogOpen);
  const roleDialogOpen = useAppSelector((s) => s.workspace.roleDialogOpen);
  const editingRoleId = useAppSelector((s) => s.workspace.editingRoleId);
  const memberSearch = useAppSelector((s) => s.workspace.memberSearch);
  const memberRoleFilter = useAppSelector((s) => s.workspace.memberRoleFilter, shallowEqual);

  // ─── TanStack Query Server State ─────────────────────────────────────
  const contextQuery = useWorkspaceContext(workspaceId);
  const rolesQuery = useWorkspaceRoles(workspaceId);
  const permissionsQuery = usePermissions();
  const membersQuery = useWorkspaceMembers(workspaceId);
  const invitationsQuery = useWorkspaceInvitations(workspaceId);

  // ─── Derived State ───────────────────────────────────────────────────
  // Hooks use `select` transforms, so `data` is already unwrapped
  const workspace = contextQuery.data?.workspace ?? null;
  const userRole = contextQuery.data?.userRole ?? null;
  const contextMembers = contextQuery.data?.members ?? [];

  const roles = rolesQuery.data?.data?.roles ?? [];
  const permissions = permissionsQuery.data?.data?.permissions ?? [];
  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  const canEdit = userRole === 'owner' || userRole === 'admin';
  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const canManageRoles = userRole === 'owner' || userRole === 'admin';

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.userId === selectedMemberId) ?? null;
  }, [selectedMemberId, members]);

  const filteredMembers = useMemo(() => {
    let result = members;
    if (memberRoleFilter !== 'all') {
      result = result.filter((m) => m.role === memberRoleFilter);
    }
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      result = result.filter(
        (m) => m.userId.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
      );
    }
    return result;
  }, [members, memberRoleFilter, memberSearch]);

  // ─── Actions ─────────────────────────────────────────────────────────
  const actions = useMemo(
    () => ({
      // Tab navigation
      setActiveTab: (tab: WorkspaceSettingsTab) => dispatch(setActiveTab(tab)),

      // Sidebar
      toggleSidebar: () => dispatch(toggleSidebar()),
      setSidebarCollapsed: (collapsed: boolean) => dispatch(setSidebarCollapsed(collapsed)),

      // Member selection
      selectMember: (userId: string | null) => dispatch(selectMember(userId)),

      // Invite dialog
      openInviteDialog: () => dispatch(openInviteDialog()),
      closeInviteDialog: () => dispatch(closeInviteDialog()),
      setInviteDialogOpen: (open: boolean) => dispatch(setInviteDialogOpen(open)),

      // Role dialog
      openRoleDialog: (roleId: string | null) => dispatch(openRoleDialog(roleId)),
      closeRoleDialog: () => dispatch(closeRoleDialog()),

      // Member filters
      setMemberSearch: (search: string) => dispatch(setMemberSearch(search)),
      setMemberRoleFilter: (filter: WorkspaceRole | 'all') => dispatch(setMemberRoleFilter(filter)),

      // Reset
      resetUI: () => dispatch(resetWorkspaceUI()),
    }),
    [dispatch],
  );

  return useMemo(
    () => ({
      // Server data
      workspace,
      userRole,
      contextMembers,
      roles,
      permissions,
      members,
      filteredMembers,
      invitations,
      selectedMember,

      // Derived permissions
      canEdit,
      canManageMembers,
      canManageRoles,

      // Loading states
      isLoading: {
        context: contextQuery.isLoading,
        roles: rolesQuery.isLoading,
        permissions: permissionsQuery.isLoading,
        members: membersQuery.isLoading,
        invitations: invitationsQuery.isLoading,
      },
      isFetching: {
        context: contextQuery.isFetching,
        roles: rolesQuery.isFetching,
        members: membersQuery.isFetching,
        invitations: invitationsQuery.isFetching,
      },

      // Error states
      errors: {
        context: contextQuery.error,
        roles: rolesQuery.error,
        members: membersQuery.error,
        invitations: invitationsQuery.error,
      },

      // UI state from Redux
      ui: {
        activeTab,
        sidebarCollapsed,
        selectedMemberId,
        inviteDialogOpen,
        roleDialogOpen,
        editingRoleId,
        memberSearch,
        memberRoleFilter,
      },

      // Actions
      actions,

      // Raw queries for advanced use
      queries: {
        context: contextQuery,
        roles: rolesQuery,
        permissions: permissionsQuery,
        members: membersQuery,
        invitations: invitationsQuery,
      },
    }),
    [
      workspace,
      userRole,
      contextMembers,
      roles,
      permissions,
      members,
      filteredMembers,
      invitations,
      selectedMember,
      canEdit,
      canManageMembers,
      canManageRoles,
      contextQuery,
      rolesQuery,
      permissionsQuery,
      membersQuery,
      invitationsQuery,
      activeTab,
      sidebarCollapsed,
      selectedMemberId,
      inviteDialogOpen,
      roleDialogOpen,
      editingRoleId,
      memberSearch,
      memberRoleFilter,
      actions,
    ],
  );
}
