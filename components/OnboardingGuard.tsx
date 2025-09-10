"use client";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

// TEMPORARILY DISABLE ONBOARDING REDIRECT
export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  // Simply render the children, bypassing onboarding logic
  return <>{children}</>;
}

/* 
// --- Original code ---
// export default function OnboardingGuard({ children }: OnboardingGuardProps) {
//   const { userData, isLoading, userId } = useUser();
//   const router = useRouter();
//
//   useEffect(() => {
//     if (!isLoading && userId && userData) {
//       if (userData.profile && !userData.profile.completedOnboarding) {
//         router.push("/onboarding");
//       }
//     }
//   }, [userData, isLoading, userId, router]);
//
//   if (isLoading || !userId) {
//     return <LoadingSpinner />;
//   }
//
//   if (userData?.profile && !userData.profile.completedOnboarding) {
//     return <LoadingSpinner />;
//   }
//
//   return <>{children}</>;
// }
*/
