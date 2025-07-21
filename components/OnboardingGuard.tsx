"use client";

import { useUser } from "@/lib/user-context-rtk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { userData, isLoading, userId } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only check onboarding status if user is authenticated and data is loaded
    if (!isLoading && userId && userData) {
      // If user exists but hasn't completed onboarding, redirect to onboarding
      if (userData.profile && !userData.profile.completedOnboarding) {
        router.push("/onboarding");
      }
    }
  }, [userData, isLoading, userId, router]);

  // Show loading while checking auth and onboarding status
  if (isLoading || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user hasn't completed onboarding, show loading (they'll be redirected)
  if (userData?.profile && !userData.profile.completedOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Setting up your training plan...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and has completed onboarding, show the protected content
  return <>{children}</>;
}
