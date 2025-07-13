"use client";

import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import OnboardingGuard from "@/components/OnboardingGuard";
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
  Play,
  Mountain,
} from "lucide-react";
import Link from "next/link";
import { formatRaceCountdown } from "@/lib/plan-utils";
import { Drawer } from "vaul";

export default function HomePage() {
  const { userData, isLoading, userId } = useUser();
  const { userId: clerkUserId, isFirebaseReady } = useClerkFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkoutDone, setIsWorkoutDone] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Calculate current week and today's workout early for useEffect
  const currentWeek =
    userData?.generatedProfile?.recommendedPlan?.currentWeek || 1;
  const today = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayName = dayNames[today.getDay()];
  const currentWeekPlan =
    userData?.generatedProfile?.recommendedPlan?.weeks?.find(
      (week) => week.weekNumber === currentWeek
    );
  const todaysWorkout = currentWeekPlan?.workouts?.find(
    (workout) => workout.day === todayName
  );

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has no training plan, show landing page
  if (!userData?.generatedProfile?.recommendedPlan) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Heading with Dictionary Style */}
            <div className="mb-16">
              <h1 className="text-8xl md:text-9xl font-serif font-light text-neutral-900 mb-6 tracking-tight">
                col
              </h1>
              <div className="text-neutral-400 text-xs uppercase tracking-[0.2em] font-medium mb-8">
                /kɒl/
              </div>

              {/* Dictionary Definition */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-left">
                  <div className="text-neutral-500 text-xs uppercase tracking-wide font-medium mb-4">
                    noun
                  </div>
                  <div className="text-neutral-900 text-lg leading-relaxed">
                    <span className="font-medium">1.</span> A mountain pass or
                    saddle between peaks.
                  </div>
                  <div className="text-neutral-900 text-lg leading-relaxed mt-3">
                    <span className="font-medium">2.</span> A structured
                    training methodology that guides athletes through
                    progressive phases, elevating performance from base fitness
                    to peak condition.
                  </div>
                  <div className="text-neutral-400 text-sm mt-6 italic">
                    &ldquo;Every great ascent begins with understanding the col
                    ahead.&rdquo;
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="space-y-6">
              <Link href="/onboarding">
                <Button
                  size="lg"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white border-0 rounded-full px-8 py-6 text-base font-medium transition-all duration-200 hover:scale-105"
                >
                  Start Training
                  <Play className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <div className="text-neutral-500 text-sm">
                Personalized trail running plans for every level
              </div>
            </div>
          </div>

          {/* Subtle Background Element */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neutral-100 rounded-full blur-3xl opacity-30"></div>
          </div>
        </div>

        {/* Features Section */}
        <div className="border-t border-neutral-200 bg-neutral-50">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mountain className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Trail-Specific
                </h3>
                <p className="text-sm text-neutral-600">
                  Plans designed for mountain terrain and elevation challenges
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Personalized
                </h3>
                <p className="text-sm text-neutral-600">
                  Adaptive training based on your experience and goals
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Progressive
                </h3>
                <p className="text-sm text-neutral-600">
                  Structured phases that build strength and endurance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Existing user dashboard continues below
  const totalWeeks =
    userData.generatedProfile?.recommendedPlan?.totalWeeks || 12;
  const currentPhase = userData.generatedProfile?.recommendedPlan?.phases?.find(
    (phase) => {
      const weekRange = phase.weeks.split("-").map((w) => parseInt(w));
      return weekRange.length === 2
        ? currentWeek >= weekRange[0] && currentWeek <= weekRange[1]
        : currentWeek === parseInt(phase.weeks);
    }
  );

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
      href: "/phase/base",
    },
    {
      title: "Strength Training",
      description: "Exercises & progression",
      icon: Dumbbell,
      href: "/strength",
    },
  ];

  return (
    <OnboardingGuard>
      <ChatDrawer
        userData={userData}
        userId={userId || ""}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      >
        <div className="min-h-screen bg-white">
          <div className="py-6 space-y-6 pb-24">
            {todaysWorkout ? (
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden mx-4">
                <div className="px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-neutral-600" />
                      <p className="text-sm text-neutral-600 font-medium">
                        Today&apos;s Workout
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workout Header */}
                <div className="p-6 py-4 pt-3 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-serif font-light text-neutral-900 tracking-tight">
                      {todaysWorkout.type}
                    </h2>
                    {isWorkoutDone && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-xs font-medium uppercase tracking-wider rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Complete</span>
                      </div>
                    )}
                  </div>

                  {/* Zone Badge */}
                  {todaysWorkout.zone && (
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className={`w-3 h-3 rounded-full ${getZoneColor(
                          todaysWorkout.zone
                        )}`}
                      ></div>
                      <span className="text-sm font-medium text-neutral-900 uppercase tracking-wider">
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
                      <div className="px-6 py-6 bg-neutral-50 border-b border-neutral-100">
                        <div
                          className={`grid ${
                            metrics.distance && metrics.vertical
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          } gap-8`}
                        >
                          {metrics.distance && (
                            <div className="text-center">
                              <div className="text-4xl font-mono font-bold text-neutral-900 tracking-tight">
                                {metrics.distance}
                              </div>
                              <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mt-1">
                                MILES
                              </div>
                            </div>
                          )}
                          {metrics.vertical && (
                            <div className="text-center">
                              <div className="text-4xl font-mono font-bold text-neutral-900 tracking-tight">
                                {metrics.vertical.replace(/,/g, "")}
                              </div>
                              <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mt-1">
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
                    <p className="text-neutral-800 leading-relaxed">
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
                          <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-neutral-700 text-sm leading-relaxed">
                            {detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach Notes */}
                {todaysWorkout.notes && (
                  <div className="px-6 pb-6">
                    <div className="bg-neutral-900 text-white p-5 rounded-xl">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wider font-medium mb-2 text-neutral-300">
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
                  {isWorkoutDone ? (
                    <div className="flex items-center justify-center gap-3 py-4 text-neutral-900 bg-neutral-100 border border-neutral-200 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium uppercase tracking-wider text-sm">
                        Workout Complete
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full py-4 text-sm font-medium uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-white border-0 rounded-xl transition-all duration-200"
                      disabled={!isFirebaseReady}
                    >
                      {isFirebaseReady ? "Mark Complete" : "Loading..."}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              // Rest Day Design
              <div className="bg-white border border-neutral-200 shadow-sm p-8 rounded-2xl mx-4">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-8 w-8 text-neutral-600" />
                  </div>
                  <h2 className="text-3xl font-serif font-light text-neutral-900 mb-3 tracking-tight">
                    Rest Day
                  </h2>
                  <p className="text-neutral-600 font-medium uppercase tracking-wider text-sm">
                    Recovery & Preparation
                  </p>
                </div>
              </div>
            )}

            {/* Progress Overview */}
            <div className="grid grid-cols-2 gap-4 mx-4">
              <div className="bg-white border border-neutral-200 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-neutral-600" />
                  <span className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
                    Week
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-neutral-900 tracking-tight">
                  {currentWeek}
                  <span className="text-neutral-400">/{totalWeeks}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-5 w-5 text-neutral-600" />
                  <span className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
                    Phase
                  </span>
                </div>
                <div className="text-xl font-semibold text-neutral-900 tracking-tight">
                  {currentPhase?.phase || "Base"}
                </div>
                <div className="text-xs text-neutral-500 mt-2 uppercase tracking-wider font-medium">
                  {currentPhase?.weeks || "1-4"}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mx-4">
              {quickActions.slice(0, 2).map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className="bg-white border border-neutral-200 p-6 hover:bg-neutral-50 transition-colors group rounded-2xl">
                    <div className="flex items-center gap-4 mb-3">
                      <action.icon className="h-6 w-6 text-neutral-600" />
                      <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 text-sm tracking-tight mb-1">
                      {action.title}
                    </h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}
              {quickActions.slice(2, 3).map((action, index) => (
                <Link key={index + 2} href={action.href}>
                  <div className="bg-white border border-neutral-200 p-6 hover:bg-neutral-50 transition-colors group rounded-2xl">
                    <div className="flex items-center gap-4 mb-3">
                      <action.icon className="h-6 w-6 text-neutral-600" />
                      <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 text-sm tracking-tight mb-1">
                      {action.title}
                    </h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}

              {/* Coach Quick Action - Now with Chat */}
              <Drawer.Trigger asChild>
                <button className="bg-white border border-neutral-200 p-6 hover:bg-neutral-50 transition-colors text-left group rounded-2xl">
                  <div className="flex items-center gap-4 mb-3">
                    <MessageCircle className="h-6 w-6 text-neutral-600" />
                    <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 text-sm tracking-tight mb-1">
                    Ask Your Coach
                  </h3>
                  <p className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
                    Personalized advice
                  </p>
                </button>
              </Drawer.Trigger>
            </div>

            {/* Race Countdown */}
            {userData.trainingBackground?.goals.raceDate && (
              <div className="bg-neutral-900 text-white p-6 border border-neutral-700 rounded-2xl mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <Flag className="h-5 w-5" />
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Race Day
                  </span>
                </div>
                <div className="text-4xl font-mono font-bold mb-2 tracking-tight">
                  {formatRaceCountdown(
                    userData.trainingBackground.goals.raceDate
                  )}
                </div>
                <div className="text-xs uppercase tracking-wider font-medium text-neutral-300">
                  {new Date(
                    userData.trainingBackground.goals.raceDate
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Button - Now with Chat */}
          <Drawer.Trigger asChild>
            <button className="fixed bottom-6 right-6 w-14 h-14 bg-neutral-900 hover:bg-neutral-800 text-white shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center z-30 rounded-full">
              <MessageCircle className="h-6 w-6" />
            </button>
          </Drawer.Trigger>

          {/* Workout Completion Modal */}
          {todaysWorkout && (
            <WorkoutCompletionModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleWorkoutCompletion}
              workoutType={todaysWorkout.type}
            />
          )}
        </div>
      </ChatDrawer>
    </OnboardingGuard>
  );
}
