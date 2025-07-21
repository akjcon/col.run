"use client";

import React, { createContext, useContext, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { useGetUserDataQuery, useInitializeNewUserMutation } from "./store/api";
import { useClerkFirebase } from "./clerk-firebase";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { createDefaultUserData } from "./default-data";
import { UserData } from "./types";

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function UserContextProvider({ children }: { children: React.ReactNode }) {
  const { userId, isFirebaseReady } = useClerkFirebase();
  const { user } = useClerkUser();

  // Skip query if no userId or Firebase not ready
  const {
    data: userData,
    isLoading,
    error,
    refetch,
  } = useGetUserDataQuery(userId || "", {
    skip: !userId || !isFirebaseReady,
  });

  const [initializeNewUser] = useInitializeNewUserMutation();

  // Initialize new users
  useEffect(() => {
    const initializeIfNeeded = async () => {
      if (
        userId &&
        isFirebaseReady &&
        !isLoading &&
        !userData &&
        !error &&
        user
      ) {
        await initializeNewUser({
          userId,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.firstName || "User",
        });
      }
    };

    initializeIfNeeded();
  }, [
    userId,
    isFirebaseReady,
    isLoading,
    userData,
    error,
    user,
    initializeNewUser,
  ]);

  // Use default data for non-authenticated users
  const effectiveUserData = userId ? userData || null : createDefaultUserData();

  const contextValue: UserContextType = {
    userData: effectiveUserData,
    isLoading: userId ? isLoading : false,
    error: error ? String(error) : null,
    userId: userId || null,
    refetch,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <UserContextProvider>{children}</UserContextProvider>
    </Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
