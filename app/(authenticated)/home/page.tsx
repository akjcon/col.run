"use client";

import { useUser } from "@/lib/user-context-rtk";
import { WorkoutCard } from "@/components/WorkoutCard";
import { TomorrowWorkoutCard } from "@/components/TomorrowWorkoutCard";
import { ProgressOverview } from "@/components/ProgressOverview";

import {
  useSaveWorkoutLogMutation,
  useIsWorkoutLoggedQuery,
  useGetAthleteSnapshotQuery,
} from "@/lib/store/api";
import { useState, useEffect } from "react";
import { useClerkFirebase } from "@/lib/clerk-firebase";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { getTodaysDay, getWeeksWithDates } from "@/lib/workout-utils";
import { getDayTitle } from "@/lib/workout-display";
import {
  calculateWeekTotalMiles,
  calculateDayTotalMiles,
  calculateDayTotal,
} from "@/lib/blocks/calculations";

export default function HomePage() {
  const { userData, isLoading } = useUser();
  const { userId: clerkUserId, isFirebaseReady } = useClerkFirebase();

  const [isWorkoutDone, setIsWorkoutDone] = useState(false);

  // RTK Query hooks
  const [saveWorkoutLog] = useSaveWorkoutLogMutation();
  const { data: snapshot } = useGetAthleteSnapshotQuery(clerkUserId || "", {
    skip: !clerkUserId || !isFirebaseReady,
  });
  const thresholdPace = snapshot?.thresholdPace ?? snapshot?.estimatedThresholdPace;

  // Get active plan directly
  const activePlan = userData?.activePlan;

  // Calculate current week
  const currentWeek = activePlan?.startDate
    ? calculateCurrentWeek(activePlan.startDate, activePlan.totalWeeks)
    : activePlan?.generatedAt
      ? calculateCurrentWeek(activePlan.generatedAt, activePlan.totalWeeks)
      : 1;

  // Calculate workout dates and find today's day
  const weeksWithDates = getWeeksWithDates(
    activePlan?.startDate,
    activePlan?.generatedAt,
    activePlan?.weeks
  );

  const todaysDay = getTodaysDay(weeksWithDates);

  // Check if today's workout is already logged
  const { data: isCompleted, isLoading: isCheckingCompletion } =
    useIsWorkoutLoggedQuery(
      {
        userId: clerkUserId || "",
        date: todaysDay?.date || 0,
        dayOfWeek: todaysDay?.dayOfWeek || "",
      },
      {
        skip:
          !isFirebaseReady || !clerkUserId || !todaysDay?.date,
      }
    );

  useEffect(() => {
    setIsWorkoutDone(isCompleted || false);
  }, [isCompleted]);

  const handleWorkoutCompletion = async (rating: number, notes?: string) => {
    if (!isFirebaseReady || !clerkUserId || !todaysDay?.date) {
      throw new Error("Authentication not ready. Please wait and try again.");
    }

    try {
      await saveWorkoutLog({
        userId: clerkUserId,
        log: {
          date: todaysDay.date,
          weekNumber: currentWeek,
          dayOfWeek: todaysDay.dayOfWeek,
          plannedTitle: getDayTitle(todaysDay),
          plannedMiles: calculateDayTotalMiles(todaysDay),
          plannedMinutes: calculateDayTotal(todaysDay),
          source: "manual",
          completedAt: Date.now(),
          feelingRating: rating,
          feelingNotes: notes,
        },
      }).unwrap();

      setIsWorkoutDone(true);
    } catch (error) {
      console.error("Failed to save workout log:", error);
      throw error;
    }
  };

  const totalWeeks = activePlan?.totalWeeks || 12;

  // Find current phase from V2 phases array
  const currentPhase = activePlan?.phases?.find(
    (phase) => currentWeek >= phase.startWeek && currentWeek <= phase.endWeek
  );

  // Loading state
  const hasFinishedLoadingPlan = !isLoading && activePlan;
  const isLoadingWorkoutCard =
    !hasFinishedLoadingPlan || (todaysDay && isCheckingCompletion);

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-2 pb-24">
        {/* Top row */}
        <div className="grid grid-cols-1">
          {/* Today's Workout */}
          <div className="z-20">
            <WorkoutCard
              todaysDay={todaysDay || null}
              isWorkoutDone={isWorkoutDone}
              isFirebaseReady={isFirebaseReady}
              onWorkoutComplete={handleWorkoutCompletion}
              isLoading={isLoadingWorkoutCard}
              thresholdPace={thresholdPace}
            />
          </div>

          {/* Tomorrow's Workout */}
          <div>
            <TomorrowWorkoutCard thresholdPace={thresholdPace} />
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mt-4">
          <ProgressOverview
            currentWeek={currentWeek}
            totalWeeks={totalWeeks}
            currentPhase={currentPhase}
            thisWeekMiles={
              activePlan?.weeks
                ? calculateWeekTotalMiles(
                    activePlan.weeks.find((w) => w.weekNumber === currentWeek) ||
                      activePlan.weeks[0]
                  )
                : undefined
            }
            raceDate={userData?.trainingBackground?.goals.raceDate}
            raceDistance={userData?.trainingBackground?.goals.raceDistance}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
