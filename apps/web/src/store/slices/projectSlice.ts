import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectUIState, ProjectSettingsTab } from '@/types/project';
import type { ProjectRole, ProjectStatus, ProjectPriority } from '@sprintio/shared';

const initialState: ProjectUIState = {
  activeTab: 'general',
  sidebarCollapsed: false,
  createDialogOpen: false,
  selectedMemberId: null,
  inviteDialogOpen: false,
  memberSearch: '',
  memberRoleFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  projectSearch: '',
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // ─── Tab Navigation ──────────────────────────────────────────────────────
    setActiveTab(state, action: PayloadAction<ProjectSettingsTab>) {
      state.activeTab = action.payload;
    },

    // ─── Sidebar ─────────────────────────────────────────────────────────────
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },

    // ─── Create Dialog ───────────────────────────────────────────────────────
    openCreateDialog(state) {
      state.createDialogOpen = true;
    },
    closeCreateDialog(state) {
      state.createDialogOpen = false;
    },

    // ─── Member Selection ────────────────────────────────────────────────────
    selectMember(state, action: PayloadAction<string | null>) {
      state.selectedMemberId = action.payload;
    },

    // ─── Invite Dialog ───────────────────────────────────────────────────────
    openInviteDialog(state) {
      state.inviteDialogOpen = true;
    },
    closeInviteDialog(state) {
      state.inviteDialogOpen = false;
    },

    // ─── Member Filters ──────────────────────────────────────────────────────
    setMemberSearch(state, action: PayloadAction<string>) {
      state.memberSearch = action.payload;
    },
    setMemberRoleFilter(state, action: PayloadAction<ProjectRole | 'all'>) {
      state.memberRoleFilter = action.payload;
    },

    // ─── Project List Filters ────────────────────────────────────────────────
    setStatusFilter(state, action: PayloadAction<ProjectStatus | 'all'>) {
      state.statusFilter = action.payload;
    },
    setPriorityFilter(state, action: PayloadAction<ProjectPriority | 'all'>) {
      state.priorityFilter = action.payload;
    },
    setProjectSearch(state, action: PayloadAction<string>) {
      state.projectSearch = action.payload;
    },

    // ─── Reset ───────────────────────────────────────────────────────────────
    resetProjectUI() {
      return initialState;
    },
  },
});

export const {
  setActiveTab,
  toggleSidebar,
  setSidebarCollapsed,
  openCreateDialog,
  closeCreateDialog,
  selectMember,
  openInviteDialog,
  closeInviteDialog,
  setMemberSearch,
  setMemberRoleFilter,
  setStatusFilter,
  setPriorityFilter,
  setProjectSearch,
  resetProjectUI,
} = projectSlice.actions;

export default projectSlice.reducer;
