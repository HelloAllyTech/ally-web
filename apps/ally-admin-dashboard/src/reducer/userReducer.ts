import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { CallType, Permissions } from "@constants";
import { UserAvailabilityStatus, UserState } from "@types";

/*
  This reducer is used to manage the state of the user.
  It is used to store the user's authentication status.
  It is used to store the user's status.
  It is used to store the user's permissions.
  It is used to store the user's available chat types.
*/
const initialState: UserState = {
  isAuthenticated: false,
  user: null as any,
  userStatus: UserAvailabilityStatus.OFFLINE,
  permissions: [],
  features: [],
  availableChatTypes: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    authenticate(state) {
      state.isAuthenticated = true;
    },
    unauthenticate(state) {
      state.isAuthenticated = false;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    setUserStatus(state, action: PayloadAction<UserAvailabilityStatus>) {
      state.userStatus = action.payload;
    },
    setPermissions(state, action: PayloadAction<Permissions[]>) {
      state.permissions = action.payload;
    },
    setFeatures(state, action: PayloadAction<string[]>) {
      state.features = action.payload;
    },
    setAvailableChatTypes(state, action: PayloadAction<CallType[]>) {
      state.availableChatTypes = action.payload;
    },
  },
});

export const {
  setUser,
  authenticate,
  setUserStatus,
  unauthenticate,
  setPermissions,
  setFeatures,
  setAvailableChatTypes,
} = userSlice.actions;
export default userSlice;
