"use client";

import { useUser } from "@/lib/user-context-redux";
import { Button } from "@/components/ui/button";

import WorkoutCompletionModal from "@/components/WorkoutCompletionModal";
import ChatDrawer from "@/components/ChatDrawer";
import {
  saveWorkoutCompletion,
  isWorkoutCompleted,
} from "@/lib/workout-tracking";
import { useState, useEffect } from "react";
import { useClerkFirebase } from "@/lib/clerk-firebase";
import {
  Calendar,
  Target,
  TrendingUp,
  MessageCircle,
  Dumbbell,
  Flag,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  formatRaceCountdown,
  calculateCurrentWeek,
  calculateWorkoutDates,
} from "@/lib/plan-utils";
import { Drawer } from "vaul";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { userData, isLoading, userId } = useUser();
  const { userId: clerkUserId, isFirebaseReady } = useClerkFirebase();
  const router = useRouter();

  const [isWorkoutDone, setIsWorkoutDone] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Calculate current week and today's workout early for useEffect
  const currentWeek = userData?.generatedProfile?.recommendedPlan?.startDate
    ? calculateCurrentWeek(
        userData.generatedProfile.recommendedPlan.startDate,
        userData.generatedProfile.recommendedPlan.totalWeeks
      )
    : userData?.generatedProfile?.recommendedPlan?.generatedAt
      ? calculateCurrentWeek(
          userData.generatedProfile.recommendedPlan.generatedAt,
          userData.generatedProfile.recommendedPlan.totalWeeks
        )
      : 1;

  // Debug logging for home page
  console.log("=== Home Page Debug ===");
  console.log("User Data:", userData);
  console.log(
    "Plan Start Date:",
    userData?.generatedProfile?.recommendedPlan?.startDate
  );
  console.log(
    "Plan Generated At:",
    userData?.generatedProfile?.recommendedPlan?.generatedAt
  );
  console.log(
    "Plan Total Weeks:",
    userData?.generatedProfile?.recommendedPlan?.totalWeeks
  );
  console.log("Calculated Current Week:", currentWeek);
  console.log("=======================");
  const today = new Date();
  // Use local date instead of UTC to avoid timezone issues
  const todayLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Calculate workout dates and find today's workout
  const weeksWithDates =
    userData?.generatedProfile?.recommendedPlan?.weeks &&
    userData?.generatedProfile?.recommendedPlan?.startDate
      ? calculateWorkoutDates(
          userData.generatedProfile.recommendedPlan.startDate,
          userData.generatedProfile.recommendedPlan.weeks
        )
      : userData?.generatedProfile?.recommendedPlan?.generatedAt
        ? calculateWorkoutDates(
            userData.generatedProfile.recommendedPlan.generatedAt,
            userData.generatedProfile.recommendedPlan.weeks || []
          )
        : [];

  const todaysWorkout = weeksWithDates
    .flatMap((week) => week.workouts)
    .find((workout) => {
      if (!workout.date) return false;
      const workoutDate = new Date(workout.date);
      // Create local date for comparison
      const workoutLocal = new Date(
        workoutDate.getFullYear(),
        workoutDate.getMonth(),
        workoutDate.getDate()
      );
      return workoutLocal.getTime() === todayLocal.getTime();
    });

  // Debug workout matching
  console.log("=== Workout Matching Debug ===");
  console.log("Today (local):", todayLocal.toISOString());
  console.log(
    "Weeks with dates:",
    weeksWithDates.map((week) => ({
      weekNumber: week.weekNumber,
      workouts: week.workouts.map((w) => ({
        day: w.day,
        date: w.date ? new Date(w.date).toISOString() : undefined,
        type: w.type,
      })),
    }))
  );
  console.log("Found today's workout:", todaysWorkout);
  console.log("===============================");

  // Check if today's workout is already completed
  useEffect(() => {
    const checkWorkoutCompletion = async () => {
      if (isFirebaseReady && clerkUserId && todaysWorkout && currentWeek) {
        const completed = await isWorkoutCompleted(
          clerkUserId,
          todaysWorkout.day,
          currentWeek
        );
        setIsWorkoutDone(completed);
      } else {
        setIsWorkoutDone(false);
      }
    };

    checkWorkoutCompletion();
  }, [isFirebaseReady, clerkUserId, todaysWorkout, currentWeek]);

  const handleWorkoutCompletion = async (rating: number, notes?: string) => {
    if (!isFirebaseReady || !clerkUserId || !todaysWorkout) {
      throw new Error("Authentication not ready. Please wait and try again.");
    }

    try {
      await saveWorkoutCompletion(clerkUserId, {
        workoutDay: todaysWorkout.day,
        workoutType: todaysWorkout.type,
        weekNumber: currentWeek,
        feelingRating: rating,
        feelingNotes: notes,
      });

      setIsWorkoutDone(true);
    } catch (error) {
      console.error("Failed to save workout completion:", error);
      throw error;
    }
  };

  // Simple loading component
  const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"></div>
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );

  // Only show loading for authenticated users who are actually loading
  if (userId && isLoading) {
    return <LoadingSpinner />;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  if (userData && !userData.profile?.completedOnboarding) {
    router.push("/onboarding");
    return <LoadingSpinner message="Redirecting to onboarding..." />;
  }

  // Existing user dashboard continues below
  const totalWeeks =
    userData?.generatedProfile?.recommendedPlan?.totalWeeks || 12;
  const currentPhase =
    userData?.generatedProfile?.recommendedPlan?.phases?.find((phase) => {
      const weekRange = phase.weeks.split("-").map((w) => parseInt(w));
      return weekRange.length === 2
        ? currentWeek >= weekRange[0] && currentWeek <= weekRange[1]
        : currentWeek === parseInt(phase.weeks);
    });

  const getZoneColor = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery") return "bg-neutral-400";
    if (zone.includes("2")) return "bg-neutral-500";
    if (zone.includes("3")) return "bg-neutral-600";
    if (zone.includes("4")) return "bg-neutral-700";
    if (zone.includes("5")) return "bg-neutral-900";
    return "bg-neutral-500";
  };

  const getZoneText = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery") return "Recovery";
    if (zone.includes("2")) return "Zone 2";
    if (zone.includes("3")) return "Zone 3";
    if (zone.includes("4")) return "Zone 4";
    if (zone.includes("5")) return "Zone 5";
    return zone;
  };

  // Extract distance/vertical from workout description or details
  const extractWorkoutMetrics = (workout: {
    description?: string;
    details?: string[];
  }) => {
    let distance = "";
    let vertical = "";

    // Look in description first
    if (workout.description) {
      const distanceMatch = workout.description.match(
        /(\d+(?:\.\d+)?)\s*(?:miles?|km|k(?!\w))/i
      );
      const verticalMatch = workout.description.match(
        /(\d{1,4}[,\d]*)\s*(?:ft|feet|meters?|m(?!\w))/i
      );

      if (distanceMatch) distance = distanceMatch[1];
      if (verticalMatch) vertical = verticalMatch[1];
    }

    // Look in details if not found
    if (workout.details && (!distance || !vertical)) {
      workout.details.forEach((detail: string) => {
        if (!distance) {
          const distanceMatch = detail.match(
            /(\d+(?:\.\d+)?)\s*(?:miles?|km|k(?!\w))/i
          );
          if (distanceMatch) distance = distanceMatch[1];
        }
        if (!vertical) {
          const verticalMatch = detail.match(
            /(\d{1,4}[,\d]*)\s*(?:ft|feet|meters?|m(?!\w))/i
          );
          if (verticalMatch) vertical = verticalMatch[1];
        }
      });
    }

    return { distance, vertical };
  };

  const quickActions = [
    {
      title: "Training Overview",
      description: "Complete plan",
      icon: Target,
      href: "/overview",
    },
    {
      title: "Current Phase",
      description: `${currentPhase?.phase || "Base Phase"}`,
      icon: TrendingUp,
      href: "/phase",
    },
    {
      title: "Strength Training",
      description: "Exercises & progression",
      icon: Dumbbell,
      href: "/strength",
    },
  ];

  // Don't render if userData is null
  if (!userData) {
    return <LoadingSpinner />;
  }

  return (
    <ChatDrawer
      userData={userData}
      userId={userId || ""}
      isOpen={isChatOpen}
      onOpenChange={setIsChatOpen}
    >
      <div className="min-h-screen bg-white">
        <div className="space-y-6 py-6 pb-24">
          {todaysWorkout ? (
            <div className="mx-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="px-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-neutral-600" />
                    <p className="text-sm font-medium text-neutral-600">
                      Today&apos;s Workout
                    </p>
                  </div>
                </div>
              </div>

              {/* Workout Header */}
              <div className="border-b border-neutral-100 p-6 py-4 pt-3">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-3xl font-light tracking-tight text-neutral-900">
                    {todaysWorkout.type}
                  </h2>
                  {isWorkoutDone && (
                    <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Complete</span>
                    </div>
                  )}
                </div>

                {/* Zone Badge */}
                {todaysWorkout.zone && (
                  <div className="mb-2 flex items-center gap-3 sm:mb-6">
                    <div
                      className={`h-3 w-3 rounded-full ${getZoneColor(
                        todaysWorkout.zone
                      )}`}
                    ></div>
                    <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">
                      {getZoneText(todaysWorkout.zone)}
                    </span>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              {(() => {
                const metrics = extractWorkoutMetrics(todaysWorkout);
                if (metrics.distance || metrics.vertical) {
                  return (
                    <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-6">
                      <div
                        className={`grid ${
                          metrics.distance && metrics.vertical
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        } gap-8`}
                      >
                        {metrics.distance && (
                          <div className="text-center">
                            <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
                              {metrics.distance}
                            </div>
                            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
                              MILES
                            </div>
                          </div>
                        )}
                        {metrics.vertical && (
                          <div className="text-center">
                            <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
                              {metrics.vertical.replace(/,/g, "")}
                            </div>
                            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
                              FEET
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Workout Description */}
              {todaysWorkout.description && (
                <div className="px-6 py-6">
                  <p className="leading-relaxed text-neutral-800">
                    {todaysWorkout.description}
                  </p>
                </div>
              )}

              {/* Detailed Instructions */}
              {todaysWorkout.details && todaysWorkout.details.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="space-y-4">
                    {todaysWorkout.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900"></div>
                        <p className="text-sm leading-relaxed text-neutral-700">
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coach Notes */}
              {todaysWorkout.notes && (
                <div className="px-6">
                  <div className="rounded-xl bg-neutral-900 p-5 text-white">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                          Coach Notes
                        </p>
                        <p className="text-sm leading-relaxed">
                          {todaysWorkout.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="px-6 pb-6">
                {!isWorkoutDone && (
                  <WorkoutCompletionModal
                    onSubmit={handleWorkoutCompletion}
                    workoutType={todaysWorkout.type}
                    trigger={
                      <Button
                        className="mt-4 w-full rounded-xl border-0 bg-neutral-900 py-4 text-sm font-medium uppercase tracking-wider text-white transition-all duration-200 hover:bg-neutral-800"
                        disabled={!isFirebaseReady}
                      >
                        {isFirebaseReady ? "Mark Complete" : "Loading..."}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          ) : (
            // Rest Day Design
            <div className="mx-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="py-12 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
                  <Calendar className="h-8 w-8 text-neutral-600" />
                </div>
                <h2 className="mb-3 font-serif text-3xl font-light tracking-tight text-neutral-900">
                  Rest Day
                </h2>
                <p className="text-sm font-medium uppercase tracking-wider text-neutral-600">
                  Recovery & Preparation
                </p>
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <div className="mx-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-neutral-600" />
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Week
                </span>
              </div>
              <div className="font-mono text-3xl font-bold tracking-tight text-neutral-900">
                {currentWeek}
                <span className="text-neutral-400">/{totalWeeks}</span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-neutral-200">
                <div
                  className="h-2 rounded-full bg-neutral-900 transition-all duration-500"
                  style={{
                    width: `${(currentWeek / totalWeeks) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-neutral-600" />
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Phase
                </span>
              </div>
              <div className="text-xl font-semibold tracking-tight text-neutral-900">
                {currentPhase?.phase || "Base"}
              </div>
              <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                {currentPhase?.weeks || "1-4"}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mx-4 grid grid-cols-2 gap-4">
            {quickActions.slice(0, 2).map((action, index) => (
              <Link key={index} href={action.href}>
                <div className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:bg-neutral-50">
                  <div className="mb-3 flex items-center gap-4">
                    <action.icon className="h-6 w-6 text-neutral-600" />
                    <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
                    {action.title}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
            {quickActions.slice(2, 3).map((action, index) => (
              <Link key={index + 2} href={action.href}>
                <div className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:bg-neutral-50">
                  <div className="mb-3 flex items-center gap-4">
                    <action.icon className="h-6 w-6 text-neutral-600" />
                    <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
                    {action.title}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}

            {/* Coach Quick Action - Now with Chat */}
            <Drawer.Trigger asChild>
              <button className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-colors hover:bg-neutral-50">
                <div className="mb-3 flex items-center gap-4">
                  <MessageCircle className="h-6 w-6 text-neutral-600" />
                  <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
                </div>
                <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
                  Ask Your Coach
                </h3>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Personalized advice
                </p>
              </button>
            </Drawer.Trigger>
          </div>

          {/* Race Countdown */}
          {userData?.trainingBackground?.goals.raceDate && (
            <div className="mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-white">
              <div className="mb-4 flex items-center gap-3">
                <Flag className="h-5 w-5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Race Day
                </span>
              </div>
              <div className="mb-2 font-mono text-4xl font-bold tracking-tight">
                {formatRaceCountdown(
                  userData?.trainingBackground?.goals.raceDate
                )}
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-neutral-300">
                {userData?.trainingBackground?.goals.raceDate
                  ? new Date(
                      userData.trainingBackground.goals.raceDate
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button - Now with Chat */}
        <Drawer.Trigger asChild>
          <button className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-neutral-800">
            <MessageCircle className="h-6 w-6" />
          </button>
        </Drawer.Trigger>
      </div>
    </ChatDrawer>
  );
}
