import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { CallType, Permissions } from "@constants";
import { UserState, UserStatus } from "@types";

/*
  This reducer is used to manage the state of the user.
  It is used to store the user's authentication status.
  It is used to store the user's status.
  It is used to store the user's permissions.
  It is used to store the user's available chat types.
*/
const initialState = {
  isAuthenticated: false,
  user: null,
  userStatus: UserStatus.OFFLINE,
  permissions: [],
  availableChatTypes: [],
} satisfies UserState as UserState;

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
    setUserStatus(state, action: PayloadAction<UserStatus>) {
      state.userStatus = action.payload;
    },
    setPermissions(state, action: PayloadAction<Permissions[]>) {
      state.permissions = action.payload;
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
  setAvailableChatTypes,
} = userSlice.actions;
export default userSlice;
