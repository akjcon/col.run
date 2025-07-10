import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { initializeNewUser, getUserData } from "./firestore";
import { UserData } from "./types";

// Hook to handle Clerk + Firebase integration (simplified - no Firebase Auth)
export function useClerkFirebase() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      if (!isSignedIn || !userId) {
        setIsFirebaseReady(false);
        return;
      }

      try {
        // Check if this is a new user and initialize if needed
        const existingUserData = await getUserData(userId);
        if (!existingUserData && user) {
          await initializeNewUser(
            userId,
            user.primaryEmailAddress?.emailAddress || "",
            user.fullName || user.firstName || "User"
          );
        }

        setIsFirebaseReady(true);
        setError(null);
      } catch (err) {
        console.error("Error initializing Firebase user:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize user data"
        );
        setIsFirebaseReady(false);
      }
    };

    initializeFirebase();
  }, [isSignedIn, userId, user]);

  return {
    isFirebaseReady,
    error,
    userId,
    isSignedIn,
  };
}

// Hook to get user data from Firebase
export function useUserData() {
  const { userId, isFirebaseReady } = useClerkFirebase();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseReady || !userId) {
      setIsLoading(false);
      return;
    }

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const data = await getUserData(userId);
        setUserData(data);
        setError(null);
      } catch (err) {
        console.error("Error loading user data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load user data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userId, isFirebaseReady]);

  return {
    userData,
    setUserData,
    isLoading,
    error,
    userId,
  };
}
