import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OrganizationUIState, OrganizationSettingsTab } from '@/types/organization';
import type { OrganizationRole } from '@sprintio/shared';

const initialState: OrganizationUIState = {
  activeTab: 'general',
  sidebarCollapsed: false,
  createDialogOpen: false,
  selectedMemberId: null,
  inviteDialogOpen: false,
  memberSearch: '',
  memberRoleFilter: 'all',
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    // ─── Tab Navigation ──────────────────────────────────────────────────────
    setActiveTab(state, action: PayloadAction<OrganizationSettingsTab>) {
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
    setMemberRoleFilter(state, action: PayloadAction<OrganizationRole | 'all'>) {
      state.memberRoleFilter = action.payload;
    },

    // ─── Reset ───────────────────────────────────────────────────────────────
    resetOrganizationUI() {
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
  resetOrganizationUI,
} = organizationSlice.actions;

export default organizationSlice.reducer;
