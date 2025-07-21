import {
  doc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrainingBackground, TrainingPlan } from "@/lib/types";
import {
  baseApi,
  sanitizeForFirestore,
  normalizeTimestamps,
  handleFirestoreError,
} from "./baseApi";

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
  }),
});

export const {
  useSaveTrainingBackgroundMutation,
  useGetLatestTrainingBackgroundQuery,
  useSaveTrainingPlanMutation,
  useGetActiveTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
} = trainingApi;
