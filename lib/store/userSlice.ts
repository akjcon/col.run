import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";
import { UserData } from "../types";
import { getUserData } from "../firestore";

// Helper function to normalize Date objects to timestamps for backwards compatibility
function normalizeUserData(userData: UserData): UserData {
  const normalized = { ...userData };

  // Normalize profile dates
  if (normalized.profile?.createdAt) {
    const createdAt = normalized.profile.createdAt as
      | Date
      | number;
    normalized.profile.createdAt =
      createdAt instanceof Date
        ? createdAt.getTime()
        : createdAt;
  }

  // Normalize training plan dates
  if (normalized.generatedProfile?.recommendedPlan) {
    const plan =
      normalized.generatedProfile.recommendedPlan;

    if (plan.startDate) {
      const startDate = plan.startDate as Date | number;
      plan.startDate =
        startDate instanceof Date
          ? startDate.getTime()
          : startDate;
    }

    if (plan.generatedAt) {
      const generatedAt = plan.generatedAt as Date | number;
      plan.generatedAt =
        generatedAt instanceof Date
          ? generatedAt.getTime()
          : generatedAt;
    }
  }

  // Normalize training background race date
  if (normalized.trainingBackground?.goals?.raceDate) {
    const raceDate = normalized.trainingBackground.goals
      .raceDate as Date | number;
    normalized.trainingBackground.goals.raceDate =
      raceDate instanceof Date
        ? raceDate.getTime()
        : raceDate;
  }

  return normalized;
}

interface UserState {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetched: number | null;
}

const initialState: UserState = {
  userData: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetched: null,
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Async thunk for fetching user data
export const fetchUserData = createAsyncThunk(
  "user/fetchUserData",
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { user: UserState };
      const now = Date.now();

      // Check if data is cached and still valid
      if (
        state.user.userData &&
        state.user.lastFetched &&
        now - state.user.lastFetched < CACHE_DURATION
      ) {
        return state.user.userData;
      }

      // Fetch fresh data from Firebase
      const data = await getUserData(userId);
      return data ? normalizeUserData(data) : data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch user data"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (
      state,
      action: PayloadAction<UserData | null>
    ) => {
      state.userData = action.payload
        ? normalizeUserData(action.payload)
        : null;
      state.lastFetched = Date.now();
    },
    clearUserData: (state) => {
      state.userData = null;
      state.lastFetched = null;
      state.error = null;
    },
    setError: (
      state,
      action: PayloadAction<string | null>
    ) => {
      state.error = action.payload;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userData = action.payload
          ? normalizeUserData(action.payload)
          : null;
        state.lastFetched = Date.now();
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isInitialized = true;
      });
  },
});

export const {
  setUserData,
  clearUserData,
  setError,
  setInitialized,
} = userSlice.actions;
export default userSlice.reducer;
