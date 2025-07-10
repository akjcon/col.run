"use client";

import { useUser } from "@/lib/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OnboardingGuard from "@/components/OnboardingGuard";
import WorkoutCompletionModal from "@/components/WorkoutCompletionModal";
import {
  saveWorkoutCompletion,
  isWorkoutCompleted,
} from "@/lib/workout-tracking";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Target,
  TrendingUp,
  MessageCircle,
  Dumbbell,
  ChevronRight,
  Clock,
  MapPin,
  Activity,
  Mountain,
  Flag,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { formatRaceCountdown } from "@/lib/plan-utils";

export default function HomePage() {
  const { userData, isLoading } = useUser();
  const { userId, isSignedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkoutDone, setIsWorkoutDone] = useState(false);

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
      if (isSignedIn && userId && todaysWorkout && currentWeek) {
        // Simple approach: just try the call, handle gracefully if it fails
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
  }, [isSignedIn, userId, todaysWorkout, currentWeek]);

  const handleWorkoutCompletion = async (rating: number, notes?: string) => {
    if (!userId || !todaysWorkout) return;

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalWeeks =
    userData.generatedProfile?.recommendedPlan?.totalWeeks || 12;
  const planType =
    userData.generatedProfile?.recommendedPlan?.planType || "Training Plan";
  const currentPhase = userData.generatedProfile?.recommendedPlan?.phases?.find(
    (phase) => {
      const weekRange = phase.weeks.split("-").map((w) => parseInt(w));
      return weekRange.length === 2
        ? currentWeek >= weekRange[0] && currentWeek <= weekRange[1]
        : currentWeek === parseInt(phase.weeks);
    }
  );

  const getZoneColor = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery")
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (zone.includes("2")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (zone.includes("3"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (zone.includes("4"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (zone.includes("5")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  const quickActions = [
    {
      title: "Training Overview",
      description: "See your complete training plan",
      icon: Target,
      href: "/overview",
      color: "bg-green-50 border-green-200 text-green-700",
    },
    {
      title: "Current Phase",
      description: `${currentPhase?.phase || "Base Phase"}`,
      icon: TrendingUp,
      href: "/phase/base",
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
    {
      title: "Strength Training",
      description: "Details and progressions",
      icon: Dumbbell,
      href: "/strength",
      color: "bg-orange-50 border-orange-200 text-orange-700",
    },
    {
      title: "Ask Your Coach",
      description: "Get personalized advice",
      icon: MessageCircle,
      href: "/chat",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
  ];

  return (
    <OnboardingGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Today's Workout */}
          {todaysWorkout ? (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Today&apos;s Workout
                  </h1>
                  <p className="text-gray-600">
                    {todayName}, Week {currentWeek} • {planType}
                  </p>
                </div>
                <div className="hidden md:flex gap-3">
                  {isWorkoutDone ? (
                    <div className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Completed!</span>
                    </div>
                  ) : (
                    <Button onClick={() => setIsModalOpen(true)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Finished Workout
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/chat">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Ask Your Coach
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Workout Type & Training Zone */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <Mountain className="h-5 w-5 text-gray-500" />
                      <span className="font-semibold text-lg text-gray-900">
                        {todaysWorkout.type}
                      </span>
                    </div>
                    {todaysWorkout.zone && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm border font-medium ${getZoneColor(
                          todaysWorkout.zone
                        )}`}
                      >
                        {todaysWorkout.zone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Workout Description */}
                {todaysWorkout.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Overview
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {todaysWorkout.description}
                    </p>
                  </div>
                )}

                {/* Workout Details */}
                {todaysWorkout.details && todaysWorkout.details.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Detailed Instructions
                    </h3>
                    <ul className="space-y-2">
                      {todaysWorkout.details.map((detail, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-gray-700"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Coach Notes */}
                {todaysWorkout.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Coach Notes
                    </h3>
                    <p className="text-amber-800">{todaysWorkout.notes}</p>
                  </div>
                )}

                {/* Finished Workout Button */}
                <div className="pt-4 border-t border-gray-200">
                  {isWorkoutDone ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-green-700 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Workout Completed!</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full"
                      size="lg"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Finished Workout
                    </Button>
                  )}
                </div>

                {/* Mobile Ask Coach Button */}
                <div className="md:hidden pt-2">
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/chat">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Ask Your Coach
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                      Rest Day
                    </h1>
                    <p className="text-gray-600">
                      {todayName}, Week {currentWeek} • Perfect time for
                      recovery!
                    </p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <Button asChild>
                    <Link href="/chat">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Ask Your Coach
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Mobile Ask Coach Button for Rest Day */}
              <div className="md:hidden mt-4">
                <Button asChild className="w-full">
                  <Link href="/chat">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Ask Your Coach
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Week
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentWeek} / {totalWeeks}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Phase
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentPhase?.phase || "Base"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Weeks {currentPhase?.weeks || "1-4"}
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Goal Distance
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userData.trainingBackground?.goals.raceDistance || "50K"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userData.trainingBackground?.goals.targetTime ||
                    "Target time not set"}
                </p>
              </CardContent>
            </Card>

            {userData.trainingBackground?.goals.raceDate && (
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Race Day
                  </CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatRaceCountdown(
                      userData.trainingBackground.goals.raceDate
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(
                      userData.trainingBackground.goals.raceDate
                    ).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <Card
                    className={`border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${action.color} pb-0`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <action.icon className="h-8 w-8" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            {action.title}
                          </h3>
                          <p className="text-xs opacity-80">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Today's Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  This Week&apos;s Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    {currentPhase?.focus ||
                      "Building aerobic base with strength training"}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Weekly Volume:</span>
                    <span className="font-medium">
                      {currentPhase?.miles || "45-50"} miles
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Vertical Gain:</span>
                    <span className="font-medium">
                      {currentPhase?.vertical || "8,000-10,000 ft"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Race Distance:</span>
                    <span className="font-medium">
                      {userData.trainingBackground?.goals.raceDistance || "50K"}
                    </span>
                  </div>
                  {userData.trainingBackground?.goals.targetTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Target Time:</span>
                      <span className="font-medium">
                        {userData.trainingBackground.goals.targetTime}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Experience:</span>
                    <span className="font-medium capitalize">
                      {userData.trainingBackground?.experience ||
                        "Intermediate"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
