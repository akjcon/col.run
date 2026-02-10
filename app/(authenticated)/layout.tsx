"use client";

import { useUser } from "@clerk/nextjs";
import { SideNav } from "@/components/navigation/SideNav";
import { MobileNav } from "@/components/navigation/MobileNav";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import OnboardingGuard from "@/components/OnboardingGuard";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && isSignedIn === false) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Don't wrap onboarding page with OnboardingGuard (would cause redirect loop)
  const isOnboarding = pathname === "/onboarding";

  const content = isOnboarding ? children : <OnboardingGuard>{children}</OnboardingGuard>;

  return (
    <>
      {/* Mobile navigation */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Mobile content */}
      <div className="md:hidden min-h-screen pt-14">
        <main className="container mx-auto px-4 py-6">
          {!isLoaded ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <LoadingSpinner variant="inline" />
            </div>
          ) : isSignedIn === false ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <LoadingSpinner variant="inline" />
            </div>
          ) : (
            content
          )}
        </main>
      </div>

      {/* Desktop layout with sidebar */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <SideNav />
        <div className="flex-1 overflow-auto">
          <main className="container mx-auto px-4 py-6">
            {!isLoaded ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner variant="inline" />
              </div>
            ) : isSignedIn === false ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner variant="inline" />
              </div>
            ) : (
              content
            )}
          </main>
        </div>
      </div>
    </>
  );
}
