import { Calendar, TrendingUp, Flag } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-spinner";
import { formatRaceCountdown } from "@/lib/plan-utils";

interface ProgressOverviewProps {
  currentWeek: number;
  totalWeeks: number;
  currentPhase?: {
    name: string;
    startWeek: number;
    endWeek: number;
  };
  thisWeekMiles?: number;
  raceDate?: number;
  raceDistance?: string;
  isLoading?: boolean;
}

export function ProgressOverview({
  currentWeek,
  totalWeeks,
  currentPhase,
  thisWeekMiles,
  raceDate,
  raceDistance,
  isLoading = false,
}: ProgressOverviewProps) {
  if (isLoading) {
    return (
      <div className="mx-4 grid grid-cols-2 gap-6">
        <div className="rounded-2xl ring-1 ring-neutral-200 border border-white bg-stone-50 p-6 shadow-sm">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="rounded-2xl ring-1 ring-neutral-200 border border-white bg-stone-50 p-6 shadow-sm">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);
  const phaseWeeksIn = currentPhase
    ? currentWeek - currentPhase.startWeek + 1
    : 0;
  const phaseWeeksTotal = currentPhase
    ? currentPhase.endWeek - currentPhase.startWeek + 1
    : 0;

  return (
    <div className="mx-4 space-y-4">
      {/* Main progress bar — full width */}
      <div className="rounded-2xl ring-1 ring-neutral-200 border border-white bg-stone-50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Week {currentWeek} of {totalWeeks}
            </span>
          </div>
          <span className="text-xs font-medium text-neutral-400">
            {progressPercent}%
          </span>
        </div>

        {/* Full plan progress bar */}
        <div className="h-2.5 w-full rounded-full bg-neutral-200">
          <div
            className="h-2.5 rounded-full bg-neutral-900 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Phase progress underneath */}
        {currentPhase && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-700">
                {currentPhase.name}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">
              Week {phaseWeeksIn} of {phaseWeeksTotal}
            </span>
          </div>
        )}
      </div>

      {/* Bottom row — mileage + race */}
      <div className="grid grid-cols-2 gap-4">
        {/* This week miles */}
        {thisWeekMiles !== undefined && (
          <div className="rounded-2xl ring-1 ring-neutral-200 border border-white bg-stone-50 px-5 py-4 shadow-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              This Week
            </span>
            <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-neutral-900">
              {Math.round(thisWeekMiles)}
              <span className="ml-1 text-sm font-normal text-neutral-400">mi</span>
            </div>
          </div>
        )}

        {/* Race countdown */}
        {raceDate && (
          <div className="rounded-2xl ring-1 ring-neutral-200 border border-white bg-stone-50 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-neutral-500" />
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                {raceDistance || "Race"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {formatRaceCountdown(raceDate)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
