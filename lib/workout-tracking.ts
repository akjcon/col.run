import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { WorkoutCompletion } from "./types";

interface WorkoutCompletionDoc {
  workoutDay: string;
  workoutType: string;
  weekNumber: number;
  feelingRating: number;
  userId: string;
  completedAt: Timestamp;
  feelingNotes?: string;
}

export async function saveWorkoutCompletion(
  userId: string,
  workoutData: {
    workoutDay: string;
    workoutType: string;
    weekNumber: number;
    feelingRating: number;
    feelingNotes?: string;
  }
): Promise<string> {
  try {
    const baseCompletion = {
      workoutDay: workoutData.workoutDay,
      workoutType: workoutData.workoutType,
      weekNumber: workoutData.weekNumber,
      feelingRating: workoutData.feelingRating,
      userId,
      completedAt: Timestamp.now(),
    };

    // Only include feelingNotes if it has a value (Firestore doesn't accept undefined)
    const workoutCompletion: WorkoutCompletionDoc =
      workoutData.feelingNotes
        ? {
            ...baseCompletion,
            feelingNotes: workoutData.feelingNotes,
          }
        : baseCompletion;

    const docRef = await addDoc(
      collection(db, "users", userId, "workoutCompletions"),
      workoutCompletion
    );

    return docRef.id;
  } catch (error) {
    console.error(
      "Error saving workout completion:",
      error
    );
    throw new Error("Failed to save workout completion");
  }
}

export async function getWorkoutCompletions(
  userId: string,
  weekNumber?: number
): Promise<WorkoutCompletion[]> {
  try {
    const completionsRef = collection(
      db,
      "users",
      userId,
      "workoutCompletions"
    );

    let q = query(
      completionsRef,
      orderBy("completedAt", "desc")
    );

    if (weekNumber) {
      q = query(
        completionsRef,
        where("weekNumber", "==", weekNumber),
        orderBy("completedAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      completedAt: doc.data().completedAt.toDate(),
    })) as WorkoutCompletion[];
  } catch (error: unknown) {
    // Suppress permission errors - they're just auth timing issues
    const errorCode = (error as { code?: string })?.code;
    if (errorCode !== "permission-denied") {
      console.error(
        "Error getting workout completions:",
        error
      );
    }
    return [];
  }
}

export async function isWorkoutCompleted(
  userId: string,
  workoutDay: string,
  weekNumber: number
): Promise<boolean> {
  try {
    const completionsRef = collection(
      db,
      "users",
      userId,
      "workoutCompletions"
    );
    const q = query(
      completionsRef,
      where("workoutDay", "==", workoutDay),
      where("weekNumber", "==", weekNumber)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: unknown) {
    // Suppress permission errors - they're just auth timing issues
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "permission-denied") {
      return false; // Assume not completed if auth isn't ready yet
    }
    console.error(
      "Error checking workout completion:",
      error
    );
    return false;
  }
}
