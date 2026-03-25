import {
  doc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  limit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TrainingBackground,
  TrainingPlan,
  WorkoutLog,
  AthleteSnapshot,
} from "@/lib/types";
import type { Day } from "@/lib/blocks/types";
import {
  baseApi,
  sanitizeForFirestore,
  normalizeTimestamps,
  handleFirestoreError,
} from "./baseApi";
import { getWeeksWithDates, getTomorrowsDay } from "@/lib/workout-utils";

export const trainingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Save training background
    saveTrainingBackground: builder.mutation<
      string,
      {
        userId: string;
        background: Omit<TrainingBackground, "id" | "createdAt">;
      }
    >({
      queryFn: async ({ userId, background }) => {
        try {
          const backgroundRef = collection(db, "users", userId, "backgrounds");
          const sanitizedData = sanitizeForFirestore({
            ...background,
            createdAt: serverTimestamp(),
          });

          const docRef = await addDoc(backgroundRef, sanitizedData);
          return { data: docRef.id };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "save training background"),
          };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "TrainingBackground",
      ],
    }),

    // Get latest training background
    getLatestTrainingBackground: builder.query<
      TrainingBackground | null,
      string
    >({
      queryFn: async (userId) => {
        try {
          const backgroundRef = collection(db, "users", userId, "backgrounds");
          const q = query(
            backgroundRef,
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            return { data: null };
          }

          const doc = snapshot.docs[0];
          const rawData = doc.data();
          const data = normalizeTimestamps({
            id: doc.id,
            ...rawData,
          } as unknown as TrainingBackground) as TrainingBackground;

          return { data };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "get training background"),
          };
        }
      },
      providesTags: ["TrainingBackground"],
    }),

    // Save training plan
    saveTrainingPlan: builder.mutation<
      string,
      {
        userId: string;
        plan: Omit<TrainingPlan, "id" | "userId" | "generatedAt">;
      }
    >({
      queryFn: async ({ userId, plan }) => {
        try {
          const planRef = collection(db, "users", userId, "trainingPlans");
          const sanitizedPlan = sanitizeForFirestore({
            ...plan,
            userId,
            generatedAt: serverTimestamp(),
            isActive: true,
          });

          const docRef = await addDoc(planRef, sanitizedPlan);

          // Deactivate other plans
          const existingPlansQuery = query(
            planRef,
            where("isActive", "==", true),
            where("__name__", "!=", docRef.id)
          );
          const existingPlans = await getDocs(existingPlansQuery);

          const deactivatePromises = existingPlans.docs.map((doc) =>
            updateDoc(doc.ref, { isActive: false })
          );
          await Promise.all(deactivatePromises);

          return { data: docRef.id };
        } catch (error) {
          return { error: handleFirestoreError(error, "save training plan") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "TrainingPlan",
      ],
    }),

    // Get active training plan
    getActiveTrainingPlan: builder.query<TrainingPlan | null, string>({
      queryFn: async (userId) => {
        try {
          const planRef = collection(db, "users", userId, "trainingPlans");
          const q = query(planRef, where("isActive", "==", true), limit(1));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            return { data: null };
          }

          const doc = snapshot.docs[0];
          const data = normalizeTimestamps({
            id: doc.id,
            ...doc.data(),
          }) as TrainingPlan;

          return { data };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "get active training plan"),
          };
        }
      },
      providesTags: ["TrainingPlan"],
    }),

    // Update training plan
    updateTrainingPlan: builder.mutation<
      void,
      {
        userId: string;
        planId: string;
        updates: Partial<TrainingPlan>;
      }
    >({
      queryFn: async ({ userId, planId, updates }) => {
        try {
          const planRef = doc(db, "users", userId, "trainingPlans", planId);
          const sanitizedUpdates = sanitizeForFirestore(updates);
          await updateDoc(planRef, sanitizedUpdates);
          return { data: undefined };
        } catch (error) {
          return { error: handleFirestoreError(error, "update training plan") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "TrainingPlan",
      ],
    }),

    // Get tomorrow's day (V2: returns Day instead of V1 Workout)
    getTomorrowsWorkout: builder.query<
      { day: Day | null; plan: TrainingPlan | null },
      string
    >({
      queryFn: async (userId) => {
        try {
          const planRef = collection(db, "users", userId, "trainingPlans");
          const q = query(planRef, where("isActive", "==", true), limit(1));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            return { data: { day: null, plan: null } };
          }

          const planDoc = snapshot.docs[0];
          const plan = normalizeTimestamps({
            id: planDoc.id,
            ...planDoc.data(),
          }) as TrainingPlan;

          const weeksWithDates = getWeeksWithDates(
            plan.startDate,
            plan.generatedAt,
            plan.weeks
          );

          const tomorrowsDay = getTomorrowsDay(weeksWithDates);

          return { data: { day: tomorrowsDay || null, plan } };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "get tomorrow's workout"),
          };
        }
      },
      providesTags: ["TrainingPlan"],
    }),

    // Get athlete snapshot
    getAthleteSnapshot: builder.query<AthleteSnapshot | null, string>({
      queryFn: async (userId) => {
        try {
          const snapshotRef = doc(
            db,
            "users",
            userId,
            "athleteSnapshot",
            "current"
          );
          const snap = await getDoc(snapshotRef);

          if (!snap.exists()) {
            return { data: null };
          }

          return {
            data: normalizeTimestamps(snap.data()) as AthleteSnapshot,
          };
        } catch (error) {
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: null };
          }
          return {
            error: handleFirestoreError(error, "get athlete snapshot"),
          };
        }
      },
      providesTags: ["AthleteSnapshot"],
    }),

    // Save workout log (uses doc ID for dedup)
    saveWorkoutLog: builder.mutation<
      string,
      { userId: string; log: Omit<WorkoutLog, "id"> & { id?: string } }
    >({
      queryFn: async ({ userId, log }) => {
        try {
          const logId =
            log.id || `${log.date}-${log.dayOfWeek}`;
          const logRef = doc(
            db,
            "users",
            userId,
            "workoutLogs",
            logId
          );
          const sanitizedLog = sanitizeForFirestore({
            ...log,
            id: logId,
          });
          await setDoc(logRef, sanitizedLog);
          return { data: logId };
        } catch (error) {
          return {
            error: handleFirestoreError(error, "save workout log"),
          };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "WorkoutLog",
      ],
    }),

    // Get workout logs for a user (optionally filtered by week)
    getWorkoutLogs: builder.query<
      WorkoutLog[],
      { userId: string; weekNumber?: number }
    >({
      queryFn: async ({ userId, weekNumber }) => {
        try {
          const logsRef = collection(
            db,
            "users",
            userId,
            "workoutLogs"
          );

          const q = weekNumber
            ? query(
                logsRef,
                where("weekNumber", "==", weekNumber),
                orderBy("completedAt", "desc")
              )
            : query(logsRef, orderBy("completedAt", "desc"));

          const querySnapshot = await getDocs(q);

          const logs = querySnapshot.docs.map((logDoc) => {
            const data = logDoc.data();
            return normalizeTimestamps({
              id: logDoc.id,
              ...data,
            } as unknown as WorkoutLog) as WorkoutLog;
          });

          return { data: logs };
        } catch (error) {
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: [] };
          }
          return {
            error: handleFirestoreError(error, "get workout logs"),
          };
        }
      },
      providesTags: ["WorkoutLog"],
    }),

    // Get workout log by date + dayOfWeek (for coaching note display)
    getWorkoutLogByDate: builder.query<
      WorkoutLog | null,
      { userId: string; date: number; dayOfWeek: string }
    >({
      queryFn: async ({ userId, date, dayOfWeek }) => {
        try {
          const logId = `${date}-${dayOfWeek}`;
          const logRef = doc(
            db,
            "users",
            userId,
            "workoutLogs",
            logId
          );
          const logSnap = await getDoc(logRef);
          if (!logSnap.exists()) {
            return { data: null };
          }
          const data = normalizeTimestamps({
            id: logSnap.id,
            ...logSnap.data(),
          } as unknown as WorkoutLog) as WorkoutLog;
          return { data };
        } catch (error) {
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: null };
          }
          return {
            error: handleFirestoreError(error, "get workout log by date"),
          };
        }
      },
      providesTags: (result, error, { userId, date }) => [
        "WorkoutLog",
        { type: "WorkoutLog", id: `${userId}-${date}` },
      ],
    }),

    // Check if a workout is logged for a given date
    isWorkoutLogged: builder.query<
      boolean,
      { userId: string; date: number; dayOfWeek: string }
    >({
      queryFn: async ({ userId, date, dayOfWeek }) => {
        try {
          const logId = `${date}-${dayOfWeek}`;
          const logRef = doc(
            db,
            "users",
            userId,
            "workoutLogs",
            logId
          );
          const logSnap = await getDoc(logRef);
          return { data: logSnap.exists() };
        } catch (error) {
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "permission-denied") {
            return { data: false };
          }
          return {
            error: handleFirestoreError(error, "check workout log"),
          };
        }
      },
      providesTags: (result, error, { userId, date }) => [
        "WorkoutLog",
        { type: "WorkoutLog", id: `${userId}-${date}` },
      ],
    }),
  }),
});

export const {
  useSaveTrainingBackgroundMutation,
  useGetLatestTrainingBackgroundQuery,
  useSaveTrainingPlanMutation,
  useGetActiveTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
  useGetTomorrowsWorkoutQuery,
  useGetAthleteSnapshotQuery,
  useSaveWorkoutLogMutation,
  useGetWorkoutLogsQuery,
  useGetWorkoutLogByDateQuery,
  useIsWorkoutLoggedQuery,
} = trainingApi;
