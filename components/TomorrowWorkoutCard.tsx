import { Calendar } from "lucide-react";
import { useGetTomorrowsWorkoutQuery } from "@/lib/store/api/trainingApi";
import { useUser } from "@/lib/user-context-rtk";
import { Skeleton } from "@/components/ui/loading-spinner";
import {
  getDayTitle,
  getDayEffortLevel,
  effortToColor,
  effortToZoneLabel,
  isRestDay,
  getWorkoutSummary,
} from "@/lib/workout-display";
import {
  calculateDayTotalMiles,
  calculateDayTotal,
} from "@/lib/blocks/calculations";

export function TomorrowWorkoutCard() {
  const { userId } = useUser();
  const { data, isLoading, error } = useGetTomorrowsWorkoutQuery(userId || "", {
    skip: !userId,
  });

  if (isLoading) {
    return (
      <div className="ml-4 mr-0 pt-2 overflow-hidden rounded-b-xl ring-1 ring-neutral-200 border border-t-0 -translate-y-1 border-white bg-stone-50 shadow-sm z-10">
        <div className="p-4">
          <div className="flex flex-col items-start justify-between gap-2">
            <Skeleton className="h-4 w-1/3 mb-1" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-5/6 mb-1" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { day: tomorrowsDay } = data;

  if (!tomorrowsDay) {
    return null;
  }

  if (isRestDay(tomorrowsDay)) {
    return (
      <div className="ml-4 mr-0 pt-2 overflow-hidden rounded-b-xl ring-1 ring-neutral-200 border border-t-0 -translate-y-1 border-white bg-stone-50 shadow-sm z-10">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Tomorrow
            </p>
          </div>
          <h3 className="font-serif text-xl font-light text-neutral-900">
            Rest Day
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Scheduled recovery day.
          </p>
        </div>
      </div>
    );
  }

  const title = getDayTitle(tomorrowsDay);
  const effortLevel = getDayEffortLevel(tomorrowsDay);
  const zoneColor = effortToColor(effortLevel);
  const zoneText = effortToZoneLabel(effortLevel);
  const totalMiles = calculateDayTotalMiles(tomorrowsDay);
  const totalMinutes = calculateDayTotal(tomorrowsDay);
  const summary = tomorrowsDay.workouts.length > 0
    ? getWorkoutSummary(tomorrowsDay.workouts[0])
    : "";

  return (
    <div className="ml-4 mr-0 pt-2 overflow-hidden rounded-b-xl ring-1 ring-neutral-200 border border-t-0 -translate-y-1 border-white bg-stone-50 shadow-sm z-10">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-neutral-500" />
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Tomorrow
              </p>
            </div>

            <h3 className="mb-2 font-serif text-xl font-light text-neutral-900">
              {title}
            </h3>

            {/* Zone Badge - Compact */}
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: zoneColor }}
              ></div>
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-700">
                {zoneText}
              </span>
            </div>

            {/* Key Metrics - Compact */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-lg font-semibold text-neutral-900">
                  {totalMiles.toFixed(1)}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  miles
                </span>
              </div>
              <span className="text-neutral-300">&bull;</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-lg font-semibold text-neutral-900">
                  {Math.round(totalMinutes)}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  min
                </span>
              </div>
            </div>

            {/* Brief Summary */}
            {summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                {summary}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
