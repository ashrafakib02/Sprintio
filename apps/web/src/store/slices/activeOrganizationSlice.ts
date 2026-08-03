import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveOrganizationState {
  organizationId: string | null;
}

const initialState: ActiveOrganizationState = {
  organizationId: null,
};

const activeOrganizationSlice = createSlice({
  name: 'activeOrganization',
  initialState,
  reducers: {
    setActiveOrganization(state, action: PayloadAction<string | null>) {
      state.organizationId = action.payload;
    },
  },
});

export const { setActiveOrganization } = activeOrganizationSlice.actions;
export default activeOrganizationSlice.reducer;
