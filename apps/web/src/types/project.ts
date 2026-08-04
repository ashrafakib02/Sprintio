import type {
  Project,
  ProjectRole,
  ProjectStatus,
  ProjectPriority,
  ProjectVisibility,
  ProjectMembership,
} from '@sprintio/shared';

// ─── Project UI State (Redux) ─────────────────────────────────────────────

export type ProjectSettingsTab = 'general' | 'members' | 'boards' | 'sprints';

export interface ProjectUIState {
  /** Currently active settings tab */
  activeTab: ProjectSettingsTab;
  /** Whether the settings sidebar is collapsed on mobile */
  sidebarCollapsed: boolean;
  /** Whether the create project dialog is open */
  createDialogOpen: boolean;
  /** ID of the member currently selected for role change or removal */
  selectedMemberId: string | null;
  /** Whether the invite member dialog is open */
  inviteDialogOpen: boolean;
  /** Search filter for member list */
  memberSearch: string;
  /** Filter for member role */
  memberRoleFilter: ProjectRole | 'all';
  /** Filter for project status */
  statusFilter: ProjectStatus | 'all';
  /** Filter for project priority */
  priorityFilter: ProjectPriority | 'all';
  /** Search term for project list */
  projectSearch: string;
}

// ─── Project Data Shapes (TanStack Query) ─────────────────────────────────

export interface ProjectContextData {
  project: Project;
  userRole: string;
  members: ProjectMembership[];
}

export interface ProjectMemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

// ─── Project List Filters ─────────────────────────────────────────────────

export interface ProjectListFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  search?: string;
  page?: number;
  limit?: number;
}
