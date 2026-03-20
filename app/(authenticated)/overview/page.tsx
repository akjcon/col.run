"use client";

import { useUser } from "@/lib/user-context-rtk";
import { useClerkFirebase } from "@/lib/clerk-firebase";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PhaseTimeline } from "@/components/overview/PhaseTimeline";
import { WeeklyVolumeChart } from "@/components/overview/WeeklyVolumeChart";
import { PlanStats } from "@/components/overview/PlanStats";
import { AthleteProfile } from "@/components/overview/AthleteProfile";
import { PaceZonesCard } from "@/components/overview/PaceZonesCard";
import { useGetAthleteSnapshotQuery } from "@/lib/store/api";

export default function Overview() {
  const { userData, isLoading } = useUser();
  const { userId, isFirebaseReady } = useClerkFirebase();
  const { data: snapshot } = useGetAthleteSnapshotQuery(userId || "", {
    skip: !userId || !isFirebaseReady,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  const activePlan = userData?.activePlan;

  if (!activePlan || !activePlan.weeks || activePlan.weeks.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Training Overview
          </h1>
          <p className="mt-2 text-neutral-500">
            Generate a training plan to see your overview.
          </p>
        </div>
      </div>
    );
  }

  const currentWeek = activePlan.startDate
    ? calculateCurrentWeek(activePlan.startDate, activePlan.totalWeeks)
    : activePlan.generatedAt
      ? calculateCurrentWeek(activePlan.generatedAt, activePlan.totalWeeks)
      : 1;

  const currentWeekData = activePlan.weeks.find(
    (w) => w.weekNumber === currentWeek
  );

  const totalPlanMiles = activePlan.weeks.reduce(
    (sum, w) => sum + calculateWeekTotalMiles(w),
    0
  );

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Athlete Section */}
        {userData?.trainingBackground && (
          <div className="mb-8">
            <AthleteProfile
              trainingBackground={userData.trainingBackground}
              snapshot={snapshot}
              currentWeekData={currentWeekData}
              totalPlanMiles={totalPlanMiles}
            />
          </div>
        )}

        {/* Pace Zones */}
        <div className="mb-8">
          <PaceZonesCard
            thresholdPace={snapshot?.thresholdPace ?? snapshot?.estimatedThresholdPace ?? userData?.trainingBackground?.thresholdPace}
          />
        </div>

        {/* Training Plan Section */}
        <div className="space-y-4">
          {activePlan.phases && activePlan.phases.length > 0 && (
            <PhaseTimeline
              phases={activePlan.phases}
              totalWeeks={activePlan.totalWeeks}
              currentWeek={currentWeek}
            />
          )}

          <WeeklyVolumeChart
            weeks={activePlan.weeks}
            currentWeek={currentWeek}
          />

          <PlanStats weeks={activePlan.weeks} />
        </div>
      </div>
    </div>
  );
}
