import type { Workspace, WorkspaceMembership, WorkspaceRole } from '@sprintio/shared';

// ─── Workspace UI State (Redux) ─────────────────────────────────────────────

export type WorkspaceSettingsTab = 'general' | 'branding' | 'members' | 'roles';

export interface WorkspaceUIState {
  /** Currently active settings tab */
  activeTab: WorkspaceSettingsTab;
  /** Whether the settings sidebar is collapsed on mobile */
  sidebarCollapsed: boolean;
  /** ID of the member currently selected for role change or removal */
  selectedMemberId: string | null;
  /** Whether the invite member dialog is open */
  inviteDialogOpen: boolean;
  /** Whether the role editor dialog is open */
  roleDialogOpen: boolean;
  /** ID of the role being edited (null = creating new) */
  editingRoleId: string | null;
  /** Search filter for member list */
  memberSearch: string;
  /** Filter for member role */
  memberRoleFilter: WorkspaceRole | 'all';
}

// ─── Workspace Data Shapes (TanStack Query) ─────────────────────────────────

export interface WorkspaceContextData {
  workspace: Workspace;
  userRole: string;
  members: WorkspaceMembership[];
}

export interface WorkspaceMemberWithUser {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}
