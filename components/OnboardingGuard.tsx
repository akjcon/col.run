"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context-rtk";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { userData, isLoading, userId } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && userId && userData) {
      if (userData.profile && !userData.profile.completedOnboarding) {
        router.push("/onboarding");
      }
    }
  }, [userData, isLoading, userId, router]);

  if (isLoading || !userId) {
    return <LoadingSpinner />;
  }

  if (userData?.profile && !userData.profile.completedOnboarding) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
