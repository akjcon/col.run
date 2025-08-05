"use client";

import { useUser } from "@/lib/user-context-rtk";
import ChatDrawer from "@/components/ChatDrawer";
import { WorkoutCard } from "@/components/WorkoutCard";
import { TomorrowWorkoutCard } from "@/components/TomorrowWorkoutCard";
import { ProgressOverview } from "@/components/ProgressOverview";
import { QuickActions } from "@/components/QuickActions";
import { RaceCountdown } from "@/components/RaceCountdown";

import {
  useSaveWorkoutCompletionMutation,
  useIsWorkoutCompletedQuery,
} from "@/lib/store/api";
import { useState, useEffect } from "react";
import { useClerkFirebase } from "@/lib/clerk-firebase";
import { MessageCircle } from "lucide-react";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { getTodaysWorkout, getWeeksWithDates } from "@/lib/workout-utils";
import { Drawer } from "vaul";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { userData, isLoading, userId } = useUser();
  const { userId: clerkUserId, isFirebaseReady } = useClerkFirebase();
  const router = useRouter();

  const [isWorkoutDone, setIsWorkoutDone] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // RTK Query hooks
  const [saveWorkoutCompletion] = useSaveWorkoutCompletionMutation();

  // Calculate current week and today's workout
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

  // Calculate workout dates and find today's workout
  const weeksWithDates = getWeeksWithDates(
    userData?.generatedProfile?.recommendedPlan?.startDate,
    userData?.generatedProfile?.recommendedPlan?.generatedAt,
    userData?.generatedProfile?.recommendedPlan?.weeks
  );

  const todaysWorkout = getTodaysWorkout(weeksWithDates);

  // Check if today's workout is already completed using RTK Query
  const { data: isCompleted, isLoading: isCheckingCompletion } =
    useIsWorkoutCompletedQuery(
      {
        userId: clerkUserId || "",
        workoutDay: todaysWorkout?.day || "",
        weekNumber: currentWeek,
      },
      {
        skip:
          !isFirebaseReady || !clerkUserId || !todaysWorkout || !currentWeek,
      }
    );

  useEffect(() => {
    setIsWorkoutDone(isCompleted || false);
  }, [isCompleted]);

  const handleWorkoutCompletion = async (rating: number, notes?: string) => {
    if (!isFirebaseReady || !clerkUserId || !todaysWorkout) {
      throw new Error("Authentication not ready. Please wait and try again.");
    }

    try {
      await saveWorkoutCompletion({
        userId: clerkUserId,
        workoutData: {
          workoutDay: todaysWorkout.day,
          workoutType: todaysWorkout.type,
          weekNumber: currentWeek,
          feelingRating: rating,
          feelingNotes: notes,
        },
      }).unwrap();

      setIsWorkoutDone(true);
    } catch (error) {
      console.error("Failed to save workout completion:", error);
      throw error;
    }
  };

  // Check if user needs onboarding
  useEffect(() => {
    if (userData && !userData.profile?.completedOnboarding) {
      router.push("/onboarding");
    }
  }, [userData, router]);

  const totalWeeks =
    userData?.generatedProfile?.recommendedPlan?.totalWeeks || 12;
  const currentPhase =
    userData?.generatedProfile?.recommendedPlan?.phases?.find((phase) => {
      const weekRange = phase.weeks.split("-").map((w) => parseInt(w));
      return weekRange.length === 2
        ? currentWeek >= weekRange[0] && currentWeek <= weekRange[1]
        : currentWeek === parseInt(phase.weeks);
    });

  // Check if we're still loading either user data or workout completion status
  // We need to show skeleton until we know if today is actually a rest day
  const hasFinishedLoadingPlan =
    !isLoading && userData?.generatedProfile?.recommendedPlan;
  const isLoadingWorkoutCard =
    !hasFinishedLoadingPlan || (todaysWorkout && isCheckingCompletion);

  // Show page structure immediately, use skeletons for loading content
  return (
    <ChatDrawer
      userData={userData}
      userId={userId || ""}
      isOpen={isChatOpen}
      onOpenChange={setIsChatOpen}
    >
      <div className="min-h-screen bg-white">
        <div className="pt-2 pb-24">
          {/* Top row with 3-column grid on desktop */}
          <div className="grid grid-cols-1">
            {/* Today's Workout - spans 2 columns on desktop */}
            <div className="z-20">
              <WorkoutCard
                todaysWorkout={todaysWorkout || null}
                isWorkoutDone={isWorkoutDone}
                isFirebaseReady={isFirebaseReady}
                onWorkoutComplete={handleWorkoutCompletion}
                isLoading={isLoadingWorkoutCard}
              />
            </div>

            {/* Tomorrow's Workout - spans 1 column on desktop */}
            <div className="mx-4">
              <TomorrowWorkoutCard />
            </div>
          </div>

          {/* Progress Overview */}
          <div className="mt-4 mx-2">
            <ProgressOverview
              currentWeek={currentWeek}
              totalWeeks={totalWeeks}
              currentPhase={currentPhase}
              isLoading={isLoading}
            />
          </div>

          <hr className="my-6 mx-6" />

          {/* Quick Actions */}
          <div className="mt-6">
            <QuickActions currentPhase={currentPhase} />
          </div>

          {/* Race Countdown */}
          {userData?.trainingBackground?.goals.raceDate && (
            <div className="mt-6">
              <RaceCountdown
                raceDate={userData.trainingBackground.goals.raceDate}
              />
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
