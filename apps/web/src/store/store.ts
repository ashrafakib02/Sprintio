import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import workspaceReducer from './slices/workspaceSlice';
import organizationReducer from './slices/organizationSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    workspace: workspaceReducer,
    organization: organizationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
