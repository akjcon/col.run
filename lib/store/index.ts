import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          // RTK Query actions
          `${baseApi.reducerPath}/queries/fulfilled`,
          `${baseApi.reducerPath}/queries/pending`,
          `${baseApi.reducerPath}/queries/rejected`,
          `${baseApi.reducerPath}/mutations/fulfilled`,
          `${baseApi.reducerPath}/mutations/pending`,
          `${baseApi.reducerPath}/mutations/rejected`,
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: [
          // RTK Query
          "meta.arg",
          "meta.baseQueryMeta.request",
          "meta.baseQueryMeta.response",
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          // RTK Query
          `${baseApi.reducerPath}`,
        ],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
