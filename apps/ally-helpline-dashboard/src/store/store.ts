import { configureStore } from "@reduxjs/toolkit";

import { sampleAPI } from "@/api/sampleAPI";

export const store = configureStore({
  reducer: {
    [sampleAPI.reducerPath]: sampleAPI.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sampleAPI.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
