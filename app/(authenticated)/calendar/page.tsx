"use client";

import { useUser } from "@/lib/user-context-rtk";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { getWeeksWithDates } from "@/lib/workout-utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export default function CalendarPage() {
  const { userData, isLoading } = useUser();

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
        <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Training Calendar
          </h1>
          <p className="mt-2 text-neutral-500">
            Generate a training plan to see your calendar.
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

  // Assign dates to all days
  const weeksWithDates = getWeeksWithDates(
    activePlan.startDate,
    activePlan.generatedAt,
    activePlan.weeks
  );

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-5xl px-2 py-6 md:px-4">
        <h1 className="mb-4 px-2 text-xl font-bold text-neutral-900">
          Training Calendar
        </h1>

        <CalendarGrid
          weeks={weeksWithDates}
          phases={activePlan.phases || []}
          currentWeek={currentWeek}
        />
      </div>
    </div>
  );
}
