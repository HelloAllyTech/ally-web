import { configureStore } from "@reduxjs/toolkit";

import { baseAPI, aiAPI } from "@api";
import eventsSlice from "@reducer/eventsReducer";
import userSlice from "@reducer/userReducer";

export const store = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    [aiAPI.reducerPath]: aiAPI.reducer,
    user: userSlice.reducer,
    events: eventsSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore these action types
          "persist/PERSIST",
          "persist/REHYDRATE",
        ],
      },
    }).concat(baseAPI.middleware, aiAPI.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
