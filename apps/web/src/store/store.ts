import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import workspaceReducer from './slices/workspaceSlice';
import organizationReducer from './slices/organizationSlice';
import projectReducer from './slices/projectSlice';
import activeOrganizationReducer from './slices/activeOrganizationSlice';
import activeWorkspaceReducer from './slices/activeWorkspaceSlice';
import activeProjectReducer from './slices/activeProjectSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    workspace: workspaceReducer,
    organization: organizationReducer,
    project: projectReducer,
    activeOrganization: activeOrganizationReducer,
    activeWorkspace: activeWorkspaceReducer,
    activeProject: activeProjectReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
