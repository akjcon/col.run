import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { initializeNewUser, getUserData } from "./firestore";
import { UserData } from "./types";

// Hook to handle Clerk + Firebase Auth integration
export function useClerkFirebase() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      if (!isSignedIn || !userId) {
        // Sign out of Firebase if user is not signed in to Clerk
        if (auth.currentUser) {
          await signOut(auth);
        }
        setIsFirebaseReady(false);
        return;
      }

      try {
        // If already authenticated with Firebase with the same user, skip
        if (auth.currentUser && auth.currentUser.uid === userId) {
          setIsFirebaseReady(true);
          return;
        }

        // Get Firebase custom token from our API
        const response = await fetch("/api/auth/firebase-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to get Firebase token: ${response.status} ${errorText}`
          );
        }

        const { firebaseToken } = await response.json();

        // Sign in to Firebase with the custom token
        await signInWithCustomToken(auth, firebaseToken);

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
        console.error("Error authenticating with Firebase:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to authenticate with Firebase"
        );
        setIsFirebaseReady(false);
      }
    };

    authenticateWithFirebase();
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
