"use client";

import React, {
  createContext,
  useContext,
  useEffect,
} from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import {
  useAppDispatch,
  useAppSelector,
} from "./store/hooks";
import {
  fetchUserData,
  setInitialized,
  clearUserData,
  setUserData as setUserDataAction,
} from "./store/userSlice";
import { useClerkFirebase } from "./clerk-firebase";
import { createDefaultUserData } from "./default-data";
import { UserData } from "./types";

interface UserContextType {
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
}

const UserContext = createContext<
  UserContextType | undefined
>(undefined);

function UserContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { userData, isLoading, error, isInitialized } =
    useAppSelector((state) => state.user);
  const { userId, isFirebaseReady } = useClerkFirebase();

  useEffect(() => {
    if (
      userId &&
      isFirebaseReady &&
      !userData &&
      !isLoading
    ) {
      // Only fetch if we don't have cached data
      dispatch(fetchUserData(userId));
    } else if (!userId && userData) {
      // Clear data if user is signed out
      dispatch(clearUserData());
    } else if (!userId && !isInitialized) {
      // Set initialized for non-authenticated users
      dispatch(setInitialized());
    }
  }, [
    userId,
    isFirebaseReady,
    userData,
    isLoading,
    dispatch,
    isInitialized,
  ]);

  // For non-authenticated users, use default data
  const effectiveUserData = userId
    ? userData
    : createDefaultUserData();

  const contextValue: UserContextType = {
    userData: effectiveUserData,
    setUserData: (data: UserData | null) => {
      dispatch(setUserDataAction(data));
    },
    isLoading: userId ? isLoading : false,
    error,
    userId: userId || null,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <UserContextProvider>{children}</UserContextProvider>
    </Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error(
      "useUser must be used within a UserProvider"
    );
  }
  return context;
}
