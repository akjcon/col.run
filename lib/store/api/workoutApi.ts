import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutCompletion } from "@/lib/types";
import {
  baseApi,
  sanitizeForFirestore,
  normalizeTimestamps,
  handleFirestoreError,
} from "./baseApi";

interface WorkoutCompletionInput {
  workoutDay: string;
  workoutType: string;
  weekNumber: number;
  feelingRating: number;
  feelingNotes?: string;
}

export const workoutApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Save workout completion
    saveWorkoutCompletion: builder.mutation<
      string,
      {
        userId: string;
        workoutData: WorkoutCompletionInput;
      }
    >({
      queryFn: async ({ userId, workoutData }) => {
        try {
          const workoutCompletion = sanitizeForFirestore({
            ...workoutData,
            userId,
            completedAt: Timestamp.now(),
          });

          const docRef = await addDoc(
            collection(db, "users", userId, "workoutCompletions"),
            workoutCompletion
          );

          return { data: docRef.id };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "save workout completion"),
          };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "WorkoutCompletion",
      ],
    }),

    // Get workout completions
    getWorkoutCompletions: builder.query<
      WorkoutCompletion[],
      {
        userId: string;
        weekNumber?: number;
      }
    >({
      queryFn: async ({ userId, weekNumber }) => {
        try {
          const completionsRef = collection(
            db,
            "users",
            userId,
            "workoutCompletions"
          );

          const q = weekNumber
            ? query(
                completionsRef,
                where("weekNumber", "==", weekNumber),
                orderBy("completedAt", "desc")
              )
            : query(completionsRef, orderBy("completedAt", "desc"));

          const querySnapshot = await getDocs(q);

          const completions = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return normalizeTimestamps({
              id: doc.id,
              ...data,
              completedAt: data.completedAt.toDate(),
            } as unknown as WorkoutCompletion) as WorkoutCompletion;
          });

          return { data: completions };
        } catch (error) {
          // Suppress permission errors - they're just auth timing issues
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: [] };
          }
          return {
            error: handleFirestoreError(error, "get workout completions"),
          };
        }
      },
      providesTags: ["WorkoutCompletion"],
    }),

    // Check if workout is completed
    isWorkoutCompleted: builder.query<
      boolean,
      {
        userId: string;
        workoutDay: string;
        weekNumber: number;
      }
    >({
      queryFn: async ({ userId, workoutDay, weekNumber }) => {
        try {
          const completionsRef = collection(
            db,
            "users",
            userId,
            "workoutCompletions"
          );
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const q = query(
            completionsRef,
            where("workoutDay", "==", workoutDay),
            where("weekNumber", "==", weekNumber),
            where("completedAt", ">=", Timestamp.fromDate(today))
          );

          const querySnapshot = await getDocs(q);
          return { data: !querySnapshot.empty };
        } catch (error) {
          // Suppress permission errors
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: false };
          }
          return {
            error: handleFirestoreError(error, "check workout completion"),
          };
        }
      },
      providesTags: (result, error, { userId, weekNumber }) => [
        "WorkoutCompletion",
        { type: "WorkoutCompletion", id: `${userId}-${weekNumber}` },
      ],
    }),
  }),
});

export const {
  useSaveWorkoutCompletionMutation,
  useGetWorkoutCompletionsQuery,
  useIsWorkoutCompletedQuery,
} = workoutApi;
