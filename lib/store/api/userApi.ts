import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  UserData,
  UserProfile,
  TrainingBackground,
  TrainingPlan,
  ChatMessage,
} from "@/lib/types";
import {
  baseApi,
  sanitizeForFirestore,
  normalizeTimestamps,
  handleFirestoreError,
} from "./baseApi";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user data (combines profile, training background, plan, etc.)
    getUserData: builder.query<UserData | null, string>({
      queryFn: async (userId) => {
        try {
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            return { data: null };
          }

          const profile = normalizeTimestamps(userSnap.data()) as UserProfile;

          // Get related data in parallel
          const [backgroundSnap, planSnap, chatSnap] = await Promise.all([
            getDocs(
              query(
                collection(db, "users", userId, "backgrounds"),
                orderBy("createdAt", "desc"),
                limit(1)
              )
            ),
            getDocs(
              query(
                collection(db, "users", userId, "trainingPlans"),
                where("isActive", "==", true),
                limit(1)
              )
            ),
            getDocs(
              query(
                collection(db, "users", userId, "chatHistory"),
                orderBy("timestamp", "desc"),
                limit(20)
              )
            ),
          ]);

          let trainingBackground: TrainingBackground | undefined;
          if (!backgroundSnap.empty) {
            const doc = backgroundSnap.docs[0];
            const rawData = doc.data();
            trainingBackground = normalizeTimestamps({
              id: doc.id,
              ...rawData,
            } as unknown as TrainingBackground) as TrainingBackground;
          }

          let activePlan: TrainingPlan | undefined;
          if (!planSnap.empty) {
            const doc = planSnap.docs[0];
            const rawData = doc.data();
            activePlan = normalizeTimestamps({
              id: doc.id,
              ...rawData,
            } as unknown as TrainingPlan) as TrainingPlan;
          }

          const chatHistory = chatSnap.docs
            .map((doc) => {
              const rawData = doc.data();
              return normalizeTimestamps({
                id: doc.id,
                ...rawData,
              } as unknown as ChatMessage) as ChatMessage;
            })
            .reverse();

          const userData: UserData = {
            profile,
            trainingBackground,
            activePlan,
            chatHistory,
          };

          return { data: userData };
        } catch (error) {
          return { error: handleFirestoreError(error, "fetch user data") };
        }
      },
      providesTags: (result, error, userId) => [
        { type: "User", id: userId },
        "UserProfile",
        "TrainingBackground",
        "TrainingPlan",
        "ChatHistory",
      ],
    }),

    // Create user profile
    createUserProfile: builder.mutation<
      void,
      { userId: string; data: Omit<UserProfile, "id"> }
    >({
      queryFn: async ({ userId, data }) => {
        try {
          const userRef = doc(db, "users", userId);
          const sanitizedData = sanitizeForFirestore({
            ...data,
            id: userId,
            createdAt: serverTimestamp(),
          });

          await setDoc(userRef, sanitizedData);
          return { data: undefined };
        } catch (error) {
          return { error: handleFirestoreError(error, "create user profile") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "UserProfile",
      ],
    }),

    // Update user profile
    updateUserProfile: builder.mutation<
      void,
      { userId: string; updates: Partial<UserProfile> }
    >({
      queryFn: async ({ userId, updates }) => {
        try {
          const userRef = doc(db, "users", userId);
          const sanitizedUpdates = sanitizeForFirestore({
            ...updates,
            lastActiveAt: serverTimestamp(),
          });

          await setDoc(userRef, sanitizedUpdates, { merge: true });
          return { data: undefined };
        } catch (error) {
          return { error: handleFirestoreError(error, "update user profile") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "UserProfile",
      ],
      async onQueryStarted({ userId, updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData("getUserData", userId, (draft) => {
            if (draft?.profile) {
              Object.assign(draft.profile, updates);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Initialize new user
    initializeNewUser: builder.mutation<
      void,
      { userId: string; email: string; name: string }
    >({
      queryFn: async ({ userId, email, name }) => {
        try {
          const userRef = doc(db, "users", userId);
          const sanitizedData = sanitizeForFirestore({
            email,
            name,
            id: userId,
            createdAt: Date.now(),
            completedOnboarding: false,
          });

          await setDoc(userRef, sanitizedData);
          return { data: undefined };
        } catch (error) {
          return { error: handleFirestoreError(error, "initialize new user") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "UserProfile",
      ],
    }),
  }),
});

export const {
  useGetUserDataQuery,
  useCreateUserProfileMutation,
  useUpdateUserProfileMutation,
  useInitializeNewUserMutation,
} = userApi;
