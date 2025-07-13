"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user has completed onboarding
      // For now, redirect to home dashboard - later we can add onboarding check
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    // Will redirect via useEffect, but show loading state
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-neutral-50">
      <div className="px-8 sm:px-6 py-8 sm:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Main Header */}
          <div className="text-center mb-8 sm:mb-20">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-medium text-neutral-900 mb-2 sm:mb-4 tracking-tight">
              col
            </h1>
            <div className="text-neutral-500 text-sm tracking-[0.2em] font-serif">
              /kɒl/
            </div>
          </div>

          {/* Layout */}
          <div className="grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start mb-8 sm:mb-20">
            {/* Dictionary Sidebar */}
            <div className="lg:col-span-4">
              {/* Mobile: No card styling */}
              <div className="block sm:hidden">
                <div className="text-neutral-500 text-xs font-serif italic mb-3">
                  noun
                </div>
                <div className="text-neutral-900 text-sm leading-relaxed mb-2 font-serif">
                  <span className="text-lg font-light">1.</span> A mountain pass
                  between peaks.
                </div>
                <div className="text-neutral-900 text-sm leading-relaxed mb-4 font-serif">
                  <span className="text-lg font-light">2.</span> A structured
                  training methodology that guides athletes through progressive
                  phases, building from base fitness to peak mountain
                  performance.
                </div>
                <div className="text-neutral-400 text-xs italic font-serif mb-6">
                  &ldquo;Every great ascent begins with understanding the col
                  ahead.&rdquo;
                </div>
              </div>

              {/* Desktop: Full card styling */}
              <div className="hidden sm:block bg-white p-6 lg:p-10 shadow-sm border border-neutral-200 rounded-xl lg:sticky lg:top-20">
                <div className="text-neutral-500 text-xs font-serif italic mb-6">
                  noun
                </div>
                <div className="text-neutral-900 text-base leading-relaxed mb-4 font-serif">
                  <span className="text-xl lg:text-2xl font-light">1.</span> A
                  mountain pass or saddle between peaks.
                </div>
                <div className="text-neutral-900 text-base leading-relaxed mb-8 font-serif">
                  <span className="text-xl lg:text-2xl font-light">2.</span> A
                  structured training methodology that guides athletes through
                  progressive phases, elevating performance from base fitness to
                  peak condition.
                </div>
                <div className="text-neutral-500 text-sm italic font-serif pl-4 border-l-2 border-neutral-200">
                  &ldquo;Every great ascent begins with understanding the col
                  ahead.&rdquo;
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="bg-white p-6 sm:p-6 lg:p-12 shadow-sm border border-neutral-200 rounded-xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-serif font-light text-neutral-900 mb-3 sm:mb-4 lg:mb-8 tracking-tight leading-tight">
                  Personalized trail running plans for every level
                </h2>

                {/* Mobile: Moderately simplified description */}
                <div className="block sm:hidden">
                  <p className="text-neutral-700 text-sm mb-4 leading-relaxed font-serif">
                    AI-powered training based on{" "}
                    <em className="font-medium">
                      Training for the Uphill Athlete
                    </em>
                    . Get structured plans that adapt to your experience and
                    mountain running goals.
                  </p>
                </div>

                {/* Desktop: Full description */}
                <div className="hidden sm:block">
                  <p className="text-neutral-700 text-base lg:text-lg mb-6 lg:mb-8 leading-relaxed font-serif">
                    AI-powered training based on{" "}
                    <em className="font-medium">
                      Training for the Uphill Athlete
                    </em>
                    . Get a structured plan that adapts to your experience,
                    goals, and current fitness level.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-10">
                  <Link href="/sign-up">
                    <Button
                      size="lg"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white border-0 rounded-full px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-serif font-medium transition-all duration-200 w-full sm:w-auto"
                    >
                      Start Training
                      <Play className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <div className="text-xs sm:text-sm text-neutral-600 font-serif text-center sm:text-left">
                    <Link
                      href="/sign-in"
                      className="hover:text-neutral-900 transition-colors"
                    >
                      Already have an account?
                    </Link>
                  </div>
                </div>

                {/* Features Grid - Hidden on mobile */}
                <div className="hidden sm:grid grid-cols-3 gap-4 pt-6 lg:pt-8 border-t border-neutral-100">
                  <div className="text-left">
                    <h3 className="font-serif font-medium text-neutral-900 mb-1">
                      Trail-Specific
                    </h3>
                    <p className="text-xs text-neutral-600 font-serif">
                      Mountain focused
                    </p>
                  </div>
                  <div className="text-left">
                    <h3 className="font-serif font-medium text-neutral-900 mb-1">
                      Personalized
                    </h3>
                    <p className="text-xs text-neutral-600 font-serif">
                      Adaptive plans
                    </p>
                  </div>
                  <div className="text-left">
                    <h3 className="font-serif font-medium text-neutral-900 mb-1">
                      Progressive
                    </h3>
                    <p className="text-xs text-neutral-600 font-serif">
                      Structured phases
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
