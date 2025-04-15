import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User, UserStatus } from "@/types/user";

interface UserState {
  isAuthenticated: boolean;
  user: User,
  userStatus: UserStatus;
}

const initialState = {
  isAuthenticated: false,
  user: null,
  userStatus: UserStatus.OFFLINE,
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
    }
  },
});

export const { authenticate, unauthenticate, setUser, setUserStatus } = userSlice.actions;
export default userSlice;
