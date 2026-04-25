import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import {
  initializeNewUser,
  getUserData,
} from "./firestore";
import { UserData } from "./types";

// Impersonation helpers
const IMPERSONATE_KEY = "col_impersonate_userId";
const IMPERSONATE_NAME_KEY = "col_impersonate_name";

export function getImpersonatedUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IMPERSONATE_KEY);
}

export function getImpersonatedName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IMPERSONATE_NAME_KEY);
}

export function startImpersonating(targetUserId: string, name: string) {
  localStorage.setItem(IMPERSONATE_KEY, targetUserId);
  localStorage.setItem(IMPERSONATE_NAME_KEY, name);
}

export function stopImpersonating() {
  localStorage.removeItem(IMPERSONATE_KEY);
  localStorage.removeItem(IMPERSONATE_NAME_KEY);
}

// Hook to handle Clerk + Firebase Auth integration
export function useClerkFirebase() {
  const { userId: clerkUserId, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isFirebaseReady, setIsFirebaseReady] =
    useState(false);
  const [error, setError] = useState<string | null>(null);

  const impersonatedId = getImpersonatedUserId();
  const effectiveUserId = impersonatedId || clerkUserId;

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      if (!isSignedIn || !clerkUserId) {
        if (auth.currentUser) {
          await signOut(auth);
        }
        setIsFirebaseReady(false);
        return;
      }

      try {
        // If already authenticated with Firebase as the effective user, skip
        if (
          auth.currentUser &&
          auth.currentUser.uid === effectiveUserId
        ) {
          setIsFirebaseReady(true);
          return;
        }

        let firebaseToken: string;

        if (impersonatedId) {
          // Get Firebase token for the impersonated user
          const response = await fetch("/api/dev/impersonate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: impersonatedId }),
          });

          if (!response.ok) {
            // If impersonation fails, clear it and fall through to normal auth
            stopImpersonating();
            window.location.reload();
            return;
          }

          const data = await response.json();
          firebaseToken = data.firebaseToken;
        } else {
          // Normal auth flow
          const response = await fetch("/api/auth/firebase-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to get Firebase token: ${response.status} ${errorText}`
            );
          }

          const data = await response.json();
          firebaseToken = data.firebaseToken;
        }

        // Sign in to Firebase with the token
        await signInWithCustomToken(auth, firebaseToken);

        // Only initialize new users during normal (non-impersonated) auth
        if (!impersonatedId) {
          const existingUserData = await getUserData(clerkUserId);
          if (!existingUserData && user) {
            await initializeNewUser(
              clerkUserId,
              user.primaryEmailAddress?.emailAddress || "",
              user.fullName || user.firstName || "User"
            );
          }
        }

        setIsFirebaseReady(true);
        setError(null);
      } catch (err) {
        console.error(
          "Error authenticating with Firebase:",
          err
        );
        setError(
          err instanceof Error
            ? err.message
            : "Failed to authenticate with Firebase"
        );
        setIsFirebaseReady(false);
      }
    };

    authenticateWithFirebase();
  }, [isSignedIn, clerkUserId, effectiveUserId, impersonatedId, user]);

  return {
    isFirebaseReady,
    error,
    userId: effectiveUserId,
    isSignedIn,
  };
}

// Hook to get user data from Firebase
export function useUserData() {
  const { userId, isFirebaseReady } = useClerkFirebase();
  const [userData, setUserData] = useState<UserData | null>(
    null
  );
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
          err instanceof Error
            ? err.message
            : "Failed to load user data"
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
