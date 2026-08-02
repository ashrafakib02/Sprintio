import type { Organization, OrganizationRole } from '@sprintio/shared';

// ─── Organization UI State (Redux) ───────────────────────────────────────

export type OrganizationSettingsTab = 'general' | 'members';

export interface OrganizationUIState {
  /** Currently active settings tab */
  activeTab: OrganizationSettingsTab;
  /** Whether the settings sidebar is collapsed on mobile */
  sidebarCollapsed: boolean;
  /** Whether the create organization dialog is open */
  createDialogOpen: boolean;
  /** ID of the member currently selected for role change or removal */
  selectedMemberId: string | null;
  /** Whether the invite member dialog is open */
  inviteDialogOpen: boolean;
  /** Search filter for member list */
  memberSearch: string;
  /** Filter for member role */
  memberRoleFilter: OrganizationRole | 'all';
}

// ─── Organization Data Shapes (TanStack Query) ───────────────────────────

export interface OrganizationContextData {
  organization: Organization;
  userRole: string;
  members: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}
