"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserData } from "./types";
import { useUserData } from "./clerk-firebase";
import { createDefaultUserData } from "./default-data";

interface UserContextType {
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Try to get data from Firebase first
  const firebaseData = useUserData();

  // Fallback to default data if Firebase not ready or no user data
  const [fallbackUserData, setFallbackUserData] = useState<UserData | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize fallback data
    if (!isInitialized) {
      setFallbackUserData(createDefaultUserData());
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Use Firebase data if available and user is signed in, otherwise use fallback
  const contextValue: UserContextType = {
    userData: firebaseData.userId ? firebaseData.userData : fallbackUserData,
    setUserData: firebaseData.userId
      ? firebaseData.setUserData
      : setFallbackUserData,
    isLoading: firebaseData.userId ? firebaseData.isLoading : !isInitialized,
    error: firebaseData.error,
    userId: firebaseData.userId || null,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
