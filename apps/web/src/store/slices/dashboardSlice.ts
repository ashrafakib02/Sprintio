import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  DashboardFilters,
  DashboardViewPreferences,
  DashboardUIState,
} from '@/types/dashboard';
import type { TaskPriority, TaskStatus } from '@sprintio/shared';

const initialFilters: DashboardFilters = {
  priority: [],
  status: [],
  search: '',
  assigneeId: null,
};

const initialViewPreferences: DashboardViewPreferences = {
  layout: 'grid',
  showBurndown: true,
  showVelocity: true,
  showTeamWorkload: true,
  showPlanUsage: true,
  collapsedSections: [],
};

const initialState: DashboardUIState = {
  filters: initialFilters,
  viewPreferences: initialViewPreferences,
  selectedTaskId: null,
  sidebarCollapsed: false,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // ─── Filters ────────────────────────────────────────────────────────
    setPriorityFilter(state, action: PayloadAction<TaskPriority[]>) {
      state.filters.priority = action.payload;
    },
    togglePriorityFilter(state, action: PayloadAction<TaskPriority>) {
      const priority = action.payload;
      const idx = state.filters.priority.indexOf(priority);
      if (idx === -1) {
        state.filters.priority.push(priority);
      } else {
        state.filters.priority.splice(idx, 1);
      }
    },
    setStatusFilter(state, action: PayloadAction<TaskStatus[]>) {
      state.filters.status = action.payload;
    },
    toggleStatusFilter(state, action: PayloadAction<TaskStatus>) {
      const status = action.payload;
      const idx = state.filters.status.indexOf(status);
      if (idx === -1) {
        state.filters.status.push(status);
      } else {
        state.filters.status.splice(idx, 1);
      }
    },
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    setAssigneeFilter(state, action: PayloadAction<string | null>) {
      state.filters.assigneeId = action.payload;
    },
    clearFilters(state) {
      state.filters = initialFilters;
    },

    // ─── View Preferences ───────────────────────────────────────────────
    setLayout(state, action: PayloadAction<'grid' | 'list'>) {
      state.viewPreferences.layout = action.payload;
    },
    toggleSectionVisibility(
      state,
      action: PayloadAction<keyof Omit<DashboardViewPreferences, 'layout' | 'collapsedSections'>>,
    ) {
      const key = action.payload;
      state.viewPreferences[key] = !state.viewPreferences[key];
    },
    toggleCollapsedSection(state, action: PayloadAction<string>) {
      const sectionId = action.payload;
      const idx = state.viewPreferences.collapsedSections.indexOf(sectionId);
      if (idx === -1) {
        state.viewPreferences.collapsedSections.push(sectionId);
      } else {
        state.viewPreferences.collapsedSections.splice(idx, 1);
      }
    },

    // ─── Selection ──────────────────────────────────────────────────────
    selectTask(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },

    // ─── Sidebar ────────────────────────────────────────────────────────
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const {
  setPriorityFilter,
  togglePriorityFilter,
  setStatusFilter,
  toggleStatusFilter,
  setSearchFilter,
  setAssigneeFilter,
  clearFilters,
  setLayout,
  toggleSectionVisibility,
  toggleCollapsedSection,
  selectTask,
  toggleSidebar,
  setSidebarCollapsed,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
