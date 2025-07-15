import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserData,
  UserProfile,
  TrainingBackground,
  TrainingPlan,
  GeneratedProfile,
  ChatMessage,
} from "./types";

// Convert Firestore timestamps to Date objects
function convertTimestamps<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate() as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertTimestamps(item)) as T;
  }

  const converted = {
    ...(data as Record<string, unknown>),
  };

  Object.keys(converted).forEach((key) => {
    const value = converted[key];
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      converted[key] = convertTimestamps(value);
    } else if (Array.isArray(value)) {
      converted[key] = value.map((item) =>
        item && typeof item === "object"
          ? convertTimestamps(item)
          : item
      );
    }
  });

  return converted as T;
}

// User Profile Operations
export async function createUserProfile(
  userId: string,
  userData: Omit<UserProfile, "id">
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    id: userId,
  });
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return convertTimestamps(userSnap.data()) as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...updates,
    lastActiveAt: serverTimestamp(),
  });
}

// Training Background Operations
export async function saveTrainingBackground(
  userId: string,
  background: Omit<TrainingBackground, "id" | "createdAt">
): Promise<string> {
  const backgroundRef = collection(
    db,
    "users",
    userId,
    "backgrounds"
  );
  const docRef = await addDoc(backgroundRef, {
    ...background,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getLatestTrainingBackground(
  userId: string
): Promise<TrainingBackground | null> {
  const backgroundRef = collection(
    db,
    "users",
    userId,
    "backgrounds"
  );
  const q = query(
    backgroundRef,
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return convertTimestamps({
    id: doc.id,
    ...doc.data(),
  } as unknown) as TrainingBackground;
}

// Training Plan Operations
export async function saveTrainingPlan(
  userId: string,
  plan: Omit<TrainingPlan, "id" | "userId" | "generatedAt">
): Promise<string> {
  const planRef = collection(
    db,
    "users",
    userId,
    "trainingPlans"
  );
  const docRef = await addDoc(planRef, {
    ...plan,
    userId,
    generatedAt: serverTimestamp(),
    isActive: true, // New plans are active by default
  });

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

  return docRef.id;
}

export async function getActiveTrainingPlan(
  userId: string
): Promise<TrainingPlan | null> {
  const planRef = collection(
    db,
    "users",
    userId,
    "trainingPlans"
  );
  const q = query(
    planRef,
    where("isActive", "==", true),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return convertTimestamps({
    id: doc.id,
    ...doc.data(),
  }) as TrainingPlan;
}

export async function getTrainingPlan(
  userId: string,
  planId: string
): Promise<TrainingPlan | null> {
  const planRef = doc(
    db,
    "users",
    userId,
    "trainingPlans",
    planId
  );
  const planSnap = await getDoc(planRef);

  if (!planSnap.exists()) {
    return null;
  }

  return convertTimestamps({
    id: planSnap.id,
    ...planSnap.data(),
  }) as TrainingPlan;
}

export async function updateTrainingPlan(
  userId: string,
  planId: string,
  updates: Partial<TrainingPlan>
): Promise<void> {
  const planRef = doc(
    db,
    "users",
    userId,
    "trainingPlans",
    planId
  );
  await updateDoc(planRef, updates);
}

// Chat Operations
export async function saveChatMessage(
  userId: string,
  message: Omit<ChatMessage, "id" | "timestamp">
): Promise<string> {
  const chatRef = collection(
    db,
    "users",
    userId,
    "chatHistory"
  );
  const docRef = await addDoc(chatRef, {
    ...message,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

export async function getChatHistory(
  userId: string,
  limitCount: number = 50
): Promise<ChatMessage[]> {
  const chatRef = collection(
    db,
    "users",
    userId,
    "chatHistory"
  );
  const q = query(
    chatRef,
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(
      (doc) =>
        convertTimestamps({
          id: doc.id,
          ...doc.data(),
        }) as ChatMessage
    )
    .reverse(); // Return in chronological order
}

// Complete User Data Operations
export async function getUserData(
  userId: string
): Promise<UserData | null> {
  try {
    const [profile, background, plan, chatHistory] =
      await Promise.all([
        getUserProfile(userId),
        getLatestTrainingBackground(userId),
        getActiveTrainingPlan(userId),
        getChatHistory(userId, 20),
      ]);

    if (!profile) {
      return null;
    }

    let generatedProfile: GeneratedProfile | undefined;
    if (background && plan) {
      generatedProfile = {
        fitnessAssessment: "Generated from user input", // This would come from LLM
        recommendedPlan: plan,
        strengths: [], // This would come from LLM analysis
        focusAreas: [], // This would come from LLM analysis
        aiAnalysis: "AI analysis pending", // This would come from LLM
      };
    }

    return {
      profile,
      trainingBackground: background || undefined,
      generatedProfile,
      chatHistory,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Real-time listener for user data
export function subscribeToUserData(
  userId: string,
  callback: (userData: UserData | null) => void
): () => void {
  const userRef = doc(db, "users", userId);

  return onSnapshot(userRef, async (doc) => {
    if (doc.exists()) {
      const userData = await getUserData(userId);
      callback(userData);
    } else {
      callback(null);
    }
  });
}

// Helper function to initialize a new user
export async function initializeNewUser(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  await createUserProfile(userId, {
    email,
    name,
    createdAt: Date.now(),
    completedOnboarding: false,
  });
}
