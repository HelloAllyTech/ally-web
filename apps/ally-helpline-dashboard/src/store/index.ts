import { configureStore } from "@reduxjs/toolkit";

import { baseAPI } from "@api/baseAPI";
import userSlice from "@reducer/userReducer";
import callsSlice from "@reducer/callsReducer";

export const store = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: userSlice.reducer,
    calls: callsSlice.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
