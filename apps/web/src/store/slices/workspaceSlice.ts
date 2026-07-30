import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WorkspaceUIState, WorkspaceSettingsTab } from '@/types/workspace';
import type { WorkspaceRole } from '@sprintio/shared';

const initialState: WorkspaceUIState = {
  activeTab: 'general',
  sidebarCollapsed: false,
  selectedMemberId: null,
  inviteDialogOpen: false,
  roleDialogOpen: false,
  editingRoleId: null,
  memberSearch: '',
  memberRoleFilter: 'all',
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    // ─── Tab Navigation ──────────────────────────────────────────────────────
    setActiveTab(state, action: PayloadAction<WorkspaceSettingsTab>) {
      state.activeTab = action.payload;
    },

    // ─── Sidebar ─────────────────────────────────────────────────────────────
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
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
    setInviteDialogOpen(state, action: PayloadAction<boolean>) {
      state.inviteDialogOpen = action.payload;
    },

    // ─── Role Dialog ─────────────────────────────────────────────────────────
    openRoleDialog(state, action: PayloadAction<string | null>) {
      state.roleDialogOpen = true;
      state.editingRoleId = action.payload;
    },
    closeRoleDialog(state) {
      state.roleDialogOpen = false;
      state.editingRoleId = null;
    },

    // ─── Member Filters ──────────────────────────────────────────────────────
    setMemberSearch(state, action: PayloadAction<string>) {
      state.memberSearch = action.payload;
    },
    setMemberRoleFilter(state, action: PayloadAction<WorkspaceRole | 'all'>) {
      state.memberRoleFilter = action.payload;
    },

    // ─── Reset ───────────────────────────────────────────────────────────────
    resetWorkspaceUI() {
      return initialState;
    },
  },
});

export const {
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
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
