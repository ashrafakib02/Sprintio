import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveProjectState {
  projectId: string | null;
}

const initialState: ActiveProjectState = {
  projectId: null,
};

const activeProjectSlice = createSlice({
  name: 'activeProject',
  initialState,
  reducers: {
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.projectId = action.payload;
    },
  },
});

export const { setActiveProject } = activeProjectSlice.actions;
export default activeProjectSlice.reducer;
