import { useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useOrganizationContext, useOrganizationMembers } from './use-organization-settings';
import {
  setActiveTab,
  toggleSidebar,
  setSidebarCollapsed,
  selectMember,
  openInviteDialog,
  closeInviteDialog,
  openCreateDialog,
  closeCreateDialog,
  setMemberSearch,
  setMemberRoleFilter,
  resetOrganizationUI,
} from '@/store/slices/organizationSlice';
import type { OrganizationSettingsTab } from '@/types/organization';
import type { OrganizationRole } from '@sprintio/shared';

/**
 * Single entry point for organization settings pages.
 * Combines Redux UI state with TanStack Query server data.
 */
export function useOrganizationState(organizationId: string) {
  const dispatch = useAppDispatch();

  // ─── Redux UI State ──────────────────────────────────────────────────
  const activeTab = useAppSelector((s) => s.organization.activeTab);
  const sidebarCollapsed = useAppSelector((s) => s.organization.sidebarCollapsed);
  const selectedMemberId = useAppSelector((s) => s.organization.selectedMemberId);
  const inviteDialogOpen = useAppSelector((s) => s.organization.inviteDialogOpen);
  const memberSearch = useAppSelector((s) => s.organization.memberSearch);
  const memberRoleFilter = useAppSelector((s) => s.organization.memberRoleFilter, shallowEqual);

  // ─── TanStack Query Server State ─────────────────────────────────────
  const contextQuery = useOrganizationContext(organizationId);
  const membersQuery = useOrganizationMembers(organizationId);

  // ─── Derived State ───────────────────────────────────────────────────
  const organization = contextQuery.data?.organization ?? null;
  const userRole = contextQuery.data?.userRole ?? null;
  const contextMembers = contextQuery.data?.members ?? [];
  const members = membersQuery.data ?? [];

  const canEdit = userRole === 'owner' || userRole === 'admin';
  const canManageMembers = userRole === 'owner' || userRole === 'admin';

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
        (m) =>
          m.userId.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.user.name.toLowerCase().includes(q) ||
          m.user.email.toLowerCase().includes(q),
      );
    }
    return result;
  }, [members, memberRoleFilter, memberSearch]);

  // ─── Actions ─────────────────────────────────────────────────────────
  const actions = useMemo(
    () => ({
      // Tab navigation
      setActiveTab: (tab: OrganizationSettingsTab) => dispatch(setActiveTab(tab)),

      // Sidebar
      toggleSidebar: () => dispatch(toggleSidebar()),
      setSidebarCollapsed: (collapsed: boolean) => dispatch(setSidebarCollapsed(collapsed)),

      // Create dialog
      openCreateDialog: () => dispatch(openCreateDialog()),
      closeCreateDialog: () => dispatch(closeCreateDialog()),

      // Member selection
      selectMember: (userId: string | null) => dispatch(selectMember(userId)),

      // Invite dialog
      openInviteDialog: () => dispatch(openInviteDialog()),
      closeInviteDialog: () => dispatch(closeInviteDialog()),

      // Member filters
      setMemberSearch: (search: string) => dispatch(setMemberSearch(search)),
      setMemberRoleFilter: (filter: OrganizationRole | 'all') =>
        dispatch(setMemberRoleFilter(filter)),

      // Reset
      resetUI: () => dispatch(resetOrganizationUI()),
    }),
    [dispatch],
  );

  return useMemo(
    () => ({
      // Server data
      organization,
      userRole,
      contextMembers,
      members,
      filteredMembers,
      selectedMember,

      // Derived permissions
      canEdit,
      canManageMembers,

      // Loading states
      isLoading: {
        context: contextQuery.isLoading,
        members: membersQuery.isLoading,
      },
      isFetching: {
        context: contextQuery.isFetching,
        members: membersQuery.isFetching,
      },

      // Error states
      errors: {
        context: contextQuery.error,
        members: membersQuery.error,
      },

      // UI state from Redux
      ui: {
        activeTab,
        sidebarCollapsed,
        selectedMemberId,
        inviteDialogOpen,
        memberSearch,
        memberRoleFilter,
      },

      // Actions
      actions,

      // Raw queries for advanced use
      queries: {
        context: contextQuery,
        members: membersQuery,
      },
    }),
    [
      organization,
      userRole,
      contextMembers,
      members,
      filteredMembers,
      selectedMember,
      canEdit,
      canManageMembers,
      contextQuery,
      membersQuery,
      activeTab,
      sidebarCollapsed,
      selectedMemberId,
      inviteDialogOpen,
      memberSearch,
      memberRoleFilter,
      actions,
    ],
  );
}
