import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveWorkspaceState {
  workspaceId: string | null;
}

const initialState: ActiveWorkspaceState = {
  workspaceId: null,
};

const activeWorkspaceSlice = createSlice({
  name: 'activeWorkspace',
  initialState,
  reducers: {
    setActiveWorkspace(state, action: PayloadAction<string | null>) {
      state.workspaceId = action.payload;
    },
  },
});

export const { setActiveWorkspace } = activeWorkspaceSlice.actions;
export default activeWorkspaceSlice.reducer;
