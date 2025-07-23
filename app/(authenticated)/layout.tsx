"use client";

import { useUser } from "@clerk/nextjs";
import { SideNav } from "@/components/navigation/SideNav";
import { MobileNav } from "@/components/navigation/MobileNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we've loaded and confirmed user is not signed in
    if (isLoaded && isSignedIn === false) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Always show the navigation structure
  return (
    <>
      {/* Mobile navigation - always visible on mobile */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Mobile content - with padding for fixed nav */}
      <div className="md:hidden min-h-screen pt-14">
        <main className="container mx-auto px-4 py-6">
          {/* Show loading spinner while checking auth */}
          {!isLoaded ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <LoadingSpinner variant="inline" />
            </div>
          ) : isSignedIn === false ? (
            // This should rarely show as the redirect will happen
            <div className="flex items-center justify-center min-h-[50vh]">
              <LoadingSpinner variant="inline" />
            </div>
          ) : (
            // Show children when authenticated
            children
          )}
        </main>
      </div>

      {/* Desktop layout with sidebar */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Sidebar */}
        <SideNav />

        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          <main className="container mx-auto px-4 py-6">
            {/* Show loading spinner while checking auth */}
            {!isLoaded ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner variant="inline" />
              </div>
            ) : isSignedIn === false ? (
              // This should rarely show as the redirect will happen
              <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner variant="inline" />
              </div>
            ) : (
              // Show children when authenticated
              children
            )}
          </main>
        </div>
      </div>
    </>
  );
}
