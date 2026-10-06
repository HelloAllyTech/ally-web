import { configureStore, isRejectedWithValue } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import { baseAPI } from "@api/baseAPI";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import callsSlice from "@reducer/callsReducer";
import chatHistorySlice from "@reducer/chatHistoryReducer";
import chatStreamSlice from "@reducer/chatStreamReducer";
import userSlice from "@reducer/userReducer";
import { captureEvent } from "@utils/analytics";

// Centralises API error tracking — fires once per failed RTK Query request
const analyticsMiddleware = () => (next: (action: unknown) => unknown) => (action: unknown) => {
  if (isRejectedWithValue(action)) {
    const rejected = action as {
      payload?: { status?: number; data?: { message?: string } };
      meta?: { arg?: { endpointName?: string } };
    };
    captureEvent(ANALYTICS_EVENTS.API_ERROR_OCCURRED, {
      [ANALYTICS_PROPS.ERROR_CODE]: rejected.payload?.status,
      [ANALYTICS_PROPS.ERROR_MESSAGE]: rejected.payload?.data?.message ?? "Unknown error",
      [ANALYTICS_PROPS.ENDPOINT]: rejected.meta?.arg?.endpointName,
    });
  }
  return next(action);
};

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
    chatHistory: chatHistorySlice.reducer,
    chatStream: chatStreamSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    })
      .concat(baseAPI.middleware)
      .concat(analyticsMiddleware),
});

// Enables refetchOnFocus / refetchOnReconnect for queries that opt in (e.g. the
// active-tooltips query), so superadmin changes propagate without a hard reload.
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
