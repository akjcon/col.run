import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
        ],
        // Ignore these field paths in all actions (backwards compatibility for old Date objects)
        ignoredActionsPaths: [
          "meta.arg",
          "payload.timestamp",
          "payload.profile.createdAt",
          "payload.profile.lastActiveAt",
          "payload.generatedProfile.recommendedPlan.startDate",
          "payload.generatedProfile.recommendedPlan.generatedAt",
          "payload.trainingBackground.goals.raceDate",
          "payload.trainingBackground.createdAt",
        ],
        // Ignore these paths in the state (backwards compatibility for old Date objects)
        ignoredPaths: [
          "user.userData.profile.createdAt",
          "user.userData.profile.lastActiveAt",
          "user.userData.generatedProfile.recommendedPlan.startDate",
          "user.userData.generatedProfile.recommendedPlan.generatedAt",
          "user.userData.trainingBackground.goals.raceDate",
          "user.userData.trainingBackground.createdAt",
          "user.lastFetched",
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
