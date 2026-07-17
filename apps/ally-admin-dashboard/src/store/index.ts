import { configureStore } from "@reduxjs/toolkit";

import { baseAPI, evaluatorAPI } from "@api";
import eventsSlice from "@reducer/eventsReducer";
import logsSlice from "@reducer/logsReducer";
import reportUploadSlice from "@reducer/reportUploadReducer";
import roleplaySpecSlice from "@reducer/roleplaySpecReducer";
import socketStatusSlice from "@reducer/socketStatusReducer";
import userSlice from "@reducer/userReducer";

export const store = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    [evaluatorAPI.reducerPath]: evaluatorAPI.reducer,
    user: userSlice.reducer,
    events: eventsSlice.reducer,
    reportUpload: reportUploadSlice.reducer,
    logs: logsSlice.reducer,
    socketStatus: socketStatusSlice.reducer,
    roleplaySpec: roleplaySpecSlice.reducer,
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
    }).concat(baseAPI.middleware, evaluatorAPI.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
