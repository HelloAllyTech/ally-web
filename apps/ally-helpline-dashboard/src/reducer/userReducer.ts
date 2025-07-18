import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User, UserStatus } from "@/types/user";
import { CallType } from "@/constants/call";

interface UserState {
  isAuthenticated: boolean;
  user: User;
  userStatus: UserStatus;
  permissions: string[];
  availableChatTypes: CallType[];
}

export type { UserState };

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
    setPermissions(state, action: PayloadAction<string[]>) {
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
