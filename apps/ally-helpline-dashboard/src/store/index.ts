import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import { baseAPI } from "@api/baseAPI";
import callsSlice from "@reducer/callsReducer";
import userSlice from "@reducer/userReducer";

// Redux Persist configuration for user slice
const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["isAuthenticated", "user", "permissions", "availableChatTypes"], // Only persist these fields
};

// Create persisted reducer
const persistedUserReducer = persistReducer(userPersistConfig, userSlice.reducer);

export const store = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: persistedUserReducer,
    calls: callsSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(baseAPI.middleware),
});

// Create persistor
export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
