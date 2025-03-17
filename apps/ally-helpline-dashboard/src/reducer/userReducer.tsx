import { createSlice } from "@reduxjs/toolkit";

import { User } from "@/types/user";

interface UserState {
  isAuthenticated: boolean;
  user: User,
  isOnline: boolean;
}

const initialState = {
  isAuthenticated: false,
  user: null,
  isOnline: true,
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
    setIsOnline(state, action) {
      state.isOnline = action.payload;
    }
  },
});

export const { authenticate, unauthenticate, setUser, setIsOnline } = userSlice.actions;
export default userSlice;
