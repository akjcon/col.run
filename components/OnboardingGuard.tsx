"use client";

import { useUser } from "@/lib/user-context-rtk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
    return <LoadingSpinner />;
  }

  // If user hasn't completed onboarding, show loading (they'll be redirected)
  if (userData?.profile && !userData.profile.completedOnboarding) {
    return <LoadingSpinner />;
  }

  // User is authenticated and has completed onboarding, show the protected content
  return <>{children}</>;
}
