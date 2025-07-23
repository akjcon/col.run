"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
    return <LoadingSpinner />;
  }

  if (isSignedIn) {
    // Will redirect via useEffect, but show loading state
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full bg-neutral-50">
      <div className="px-8 py-8 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          {/* Main Header */}
          <div className="mb-8 text-center sm:mb-20">
            <h1 className="mb-2 font-serif text-4xl font-medium tracking-tight text-neutral-900 sm:mb-4 sm:text-5xl md:text-6xl">
              col
            </h1>
            <div className="font-serif text-sm tracking-[0.2em] text-neutral-500">
              /kɒl/
            </div>
          </div>

          {/* Layout */}
          <div className="mb-8 grid items-start gap-4 sm:mb-20 sm:gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Dictionary Sidebar */}
            <div className="lg:col-span-4">
              {/* Mobile: No card styling */}
              <div className="block sm:hidden">
                <div className="mb-3 font-serif text-xs italic text-neutral-500">
                  noun
                </div>
                <div className="mb-2 font-serif text-sm leading-relaxed text-neutral-900">
                  <span className="text-lg font-light">1.</span> A mountain pass
                  between peaks.
                </div>
                <div className="mb-4 font-serif text-sm leading-relaxed text-neutral-900">
                  <span className="text-lg font-light">2.</span> A structured
                  training methodology that guides athletes through progressive
                  phases, building from base fitness to peak mountain
                  performance.
                </div>
                <div className="mb-6 font-serif text-xs italic text-neutral-400">
                  &ldquo;Every great ascent begins with understanding the col
                  ahead.&rdquo;
                </div>
              </div>

              {/* Desktop: Full card styling */}
              <div className="hidden rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:block lg:sticky lg:top-20 lg:p-10">
                <div className="mb-6 font-serif text-xs italic text-neutral-500">
                  noun
                </div>
                <div className="mb-4 font-serif text-base leading-relaxed text-neutral-900">
                  <span className="text-xl font-light lg:text-2xl">1.</span> A
                  mountain pass or saddle between peaks.
                </div>
                <div className="mb-8 font-serif text-base leading-relaxed text-neutral-900">
                  <span className="text-xl font-light lg:text-2xl">2.</span> A
                  structured training methodology that guides athletes through
                  progressive phases, elevating performance from base fitness to
                  peak condition.
                </div>
                <div className="border-l-2 border-neutral-200 pl-4 font-serif text-sm italic text-neutral-500">
                  &ldquo;Every great ascent begins with understanding the col
                  ahead.&rdquo;
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-6 lg:p-12">
                <h2 className="mb-3 font-serif text-xl font-light leading-tight tracking-tight text-neutral-900 sm:mb-4 sm:text-2xl md:text-3xl lg:mb-8 lg:text-4xl xl:text-5xl">
                  Personalized trail running plans for every level
                </h2>

                {/* Mobile: Moderately simplified description */}
                <div className="block sm:hidden">
                  <p className="mb-4 font-serif text-sm leading-relaxed text-neutral-700">
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
                  <p className="mb-6 font-serif text-base leading-relaxed text-neutral-700 lg:mb-8 lg:text-lg">
                    AI-powered training based on{" "}
                    <em className="font-medium">
                      Training for the Uphill Athlete
                    </em>
                    . Get a structured plan that adapts to your experience,
                    goals, and current fitness level.
                  </p>
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4 lg:mb-10 lg:gap-6">
                  <Link href="/sign-up">
                    <Button
                      size="lg"
                      className="w-full rounded-full border-0 bg-neutral-900 px-6 py-3 font-serif text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                    >
                      Start Training
                      <Play className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>

                  <div className="text-center font-serif text-xs text-neutral-600 sm:text-left sm:text-sm">
                    <Link
                      href="/sign-in"
                      className="transition-colors hover:text-neutral-900"
                    >
                      Already have an account?
                    </Link>
                  </div>
                </div>

                {/* Features Grid - Hidden on mobile */}
                <div className="hidden grid-cols-3 gap-4 border-t border-neutral-100 pt-6 sm:grid lg:pt-8">
                  <div className="text-left">
                    <h3 className="mb-1 font-serif font-medium text-neutral-900">
                      Trail-Specific
                    </h3>
                    <p className="font-serif text-xs text-neutral-600">
                      Mountain focused
                    </p>
                  </div>
                  <div className="text-left">
                    <h3 className="mb-1 font-serif font-medium text-neutral-900">
                      Personalized
                    </h3>
                    <p className="font-serif text-xs text-neutral-600">
                      Adaptive plans
                    </p>
                  </div>
                  <div className="text-left">
                    <h3 className="mb-1 font-serif font-medium text-neutral-900">
                      Progressive
                    </h3>
                    <p className="font-serif text-xs text-neutral-600">
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
