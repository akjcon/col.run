"use client";

import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import OnboardingGuard from "@/components/OnboardingGuard";
import WorkoutCompletionModal from "@/components/WorkoutCompletionModal";
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
  X,
  Send,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatRaceCountdown } from "@/lib/plan-utils";

export default function HomePage() {
  const { userData, isLoading } = useUser();
  const { userId, isFirebaseReady } = useClerkFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkoutDone, setIsWorkoutDone] = useState(false);
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);

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
      if (isFirebaseReady && userId && todaysWorkout && currentWeek) {
        const completed = await isWorkoutCompleted(
          userId,
          todaysWorkout.day,
          currentWeek
        );
        setIsWorkoutDone(completed);
      } else {
        setIsWorkoutDone(false);
      }
    };

    checkWorkoutCompletion();
  }, [isFirebaseReady, userId, todaysWorkout, currentWeek]);

  const handleWorkoutCompletion = async (rating: number, notes?: string) => {
    if (!isFirebaseReady || !userId || !todaysWorkout) {
      throw new Error("Authentication not ready. Please wait and try again.");
    }

    try {
      await saveWorkoutCompletion(userId, {
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

  if (isLoading || !userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading workout...</p>
        </div>
      </div>
    );
  }

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
    if (zone.includes("1") || zone === "Recovery") return "bg-gray-400";
    if (zone.includes("2")) return "bg-gray-500";
    if (zone.includes("3")) return "bg-gray-600";
    if (zone.includes("4")) return "bg-gray-700";
    if (zone.includes("5")) return "bg-gray-900";
    return "bg-gray-500";
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
      <div className="min-h-screen bg-gray-100 relative">
        <div className="py-4 space-y-6 pb-24">
          {todaysWorkout ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mx-4">
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <p className="text-sm text-gray-600 font-medium">
                      Today&apos;s Workout
                    </p>
                  </div>
                </div>
              </div>
              {/* Workout Header */}
              <div className="p-6 py-4 pt-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {todaysWorkout.type}
                  </h2>
                  {isWorkoutDone && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-xs font-medium uppercase tracking-wide rounded-lg">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Complete</span>
                    </div>
                  )}
                </div>

                {/* Zone Badge */}
                {todaysWorkout.zone && (
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`w-4 h-4 rounded-sm ${getZoneColor(
                        todaysWorkout.zone
                      )}`}
                    ></div>
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
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
                    <div className="px-6 py-6 bg-gray-50 border-b border-gray-100">
                      <div
                        className={`grid ${
                          metrics.distance && metrics.vertical
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        } gap-8`}
                      >
                        {metrics.distance && (
                          <div className="text-center">
                            <div className="text-4xl font-black text-gray-900 tracking-tighter font-mono">
                              {metrics.distance}
                            </div>
                            <div className="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1">
                              MILES
                            </div>
                          </div>
                        )}
                        {metrics.vertical && (
                          <div className="text-center">
                            <div className="text-4xl font-black text-gray-900 tracking-tighter font-mono">
                              {metrics.vertical.replace(/,/g, "")}
                            </div>
                            <div className="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1">
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
                  <p className="text-gray-800 leading-relaxed font-medium">
                    {todaysWorkout.description}
                  </p>
                </div>
              )}

              {/* Detailed Instructions */}
              {todaysWorkout.details && todaysWorkout.details.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    {todaysWorkout.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700 text-sm leading-relaxed font-medium">
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
                  <div className="bg-gray-800 text-white p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs uppercase tracking-widest font-bold mb-2">
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
                  <div className="flex items-center justify-center gap-3 py-4 text-gray-900 bg-gray-100 border border-gray-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold uppercase tracking-wide text-sm">
                      Workout Complete
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 text-sm font-bold uppercase tracking-widest bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-lg"
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
            <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-xl mx-4">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-gray-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                  Rest Day
                </h2>
                <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">
                  Recovery & Preparation
                </p>
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <div className="grid grid-cols-2 gap-4 mx-4">
            <div className="bg-white border border-gray-200 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">
                  Week
                </span>
              </div>
              <div className="text-3xl font-black text-gray-900 font-mono tracking-tighter">
                {currentWeek}
                <span className="text-gray-400">/{totalWeeks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                <div
                  className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">
                  Phase
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {currentPhase?.phase || "Base"}
              </div>
              <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide font-medium">
                {currentPhase?.weeks || "1-4"}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mx-4">
            {quickActions.slice(0, 2).map((action, index) => (
              <Link key={index} href={action.href}>
                <div className="bg-white border border-gray-200 p-6 hover:bg-gray-50 transition-colors group rounded-xl">
                  <div className="flex items-center gap-4 mb-3">
                    <action.icon className="h-6 w-6 text-gray-600" />
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm tracking-tight mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
            {quickActions.slice(2, 3).map((action, index) => (
              <Link key={index + 2} href={action.href}>
                <div className="bg-white border border-gray-200 p-6 hover:bg-gray-50 transition-colors group rounded-xl">
                  <div className="flex items-center gap-4 mb-3">
                    <action.icon className="h-6 w-6 text-gray-600" />
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm tracking-tight mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
            {/* Coach Quick Action */}
            <button
              onClick={() => setIsCoachDrawerOpen(true)}
              className="bg-white border border-gray-200 p-6 hover:bg-gray-50 transition-colors text-left group rounded-xl"
            >
              <div className="flex items-center gap-4 mb-3">
                <MessageCircle className="h-6 w-6 text-gray-600" />
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm tracking-tight mb-1">
                Ask Your Coach
              </h3>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                Personalized advice
              </p>
            </button>
          </div>

          {/* Race Countdown */}
          {userData.trainingBackground?.goals.raceDate && (
            <div className="bg-gray-900 text-white p-6 border border-gray-700 rounded-xl mx-4">
              <div className="flex items-center gap-3 mb-4">
                <Flag className="h-5 w-5" />
                <span className="text-xs uppercase tracking-widest font-bold">
                  Race Day
                </span>
              </div>
              <div className="text-4xl font-black mb-2 font-mono tracking-tighter">
                {formatRaceCountdown(
                  userData.trainingBackground.goals.raceDate
                )}
              </div>
              <div className="text-xs uppercase tracking-wide font-medium text-gray-300">
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

        {/* Floating Action Button */}
        <button
          onClick={() => setIsCoachDrawerOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center z-40 rounded-xl"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        {/* Bottom Drawer Overlay */}
        {isCoachDrawerOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50"
            onClick={() => setIsCoachDrawerOpen(false)}
          >
            {/* Bottom Drawer */}
            <div
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Handle */}
              <div className="flex justify-center py-4 border-b border-gray-100">
                <div className="w-12 h-1 bg-gray-400 rounded-full"></div>
              </div>

              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Your Coach
                  </h2>
                  <p className="text-sm text-gray-600 uppercase tracking-wide font-medium">
                    Personalized training advice
                  </p>
                </div>
                <button
                  onClick={() => setIsCoachDrawerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest">
                      Quick Questions
                    </h3>
                    <div className="space-y-3">
                      <button className="block w-full text-left p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition-colors font-medium">
                        &ldquo;How&apos;s my training progressing?&rdquo;
                      </button>
                      <button className="block w-full text-left p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition-colors font-medium">
                        &ldquo;Should I modify today&apos;s workout?&rdquo;
                      </button>
                      <button className="block w-full text-left p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition-colors font-medium">
                        &ldquo;I&apos;m feeling tired, what should I do?&rdquo;
                      </button>
                    </div>
                  </div>

                  <div>
                    <Link href="/chat">
                      <Button
                        className="w-full py-4 text-sm font-bold uppercase tracking-widest bg-gray-900 hover:bg-gray-800 text-white border-0 rounded-lg"
                        onClick={() => setIsCoachDrawerOpen(false)}
                      >
                        <Send className="h-5 w-5 mr-3" />
                        Start Conversation
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </OnboardingGuard>
  );
}
