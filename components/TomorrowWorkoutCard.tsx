import { Calendar } from "lucide-react";
import { getZoneColor, getZoneText, extractWorkoutMetrics } from "@/lib/utils";
import { useGetTomorrowsWorkoutQuery } from "@/lib/store/api/trainingApi";
import { useUser } from "@/lib/user-context-rtk";
import { Skeleton } from "@/components/ui/loading-spinner";

export function TomorrowWorkoutCard() {
  const { userId } = useUser();
  const { data, isLoading, error } = useGetTomorrowsWorkoutQuery(userId || "", {
    skip: !userId,
  });

  if (isLoading) {
    return (
      <div className="mx-4 md:mx-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { workout: tomorrowsWorkout } = data;

  if (!tomorrowsWorkout) {
    console.log("No workout for tomorrow");
    return null;
  }

  const metrics = extractWorkoutMetrics(tomorrowsWorkout);

  return (
    <div className="md:mx-0 mx-2 pt-2 overflow-hidden rounded-b-xl ring-1 ring-neutral-200 border border-t-0 -translate-y-1 border-white bg-stone-50 shadow-sm z-10">
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
              {tomorrowsWorkout.type}
            </h3>

            {/* Zone Badge - Compact */}
            {tomorrowsWorkout.zone && (
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: getZoneColor(tomorrowsWorkout.zone),
                  }}
                ></div>
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-700">
                  {getZoneText(tomorrowsWorkout.zone)}
                </span>
              </div>
            )}

            {/* Key Metrics - Compact */}
            {(metrics.distance || metrics.vertical) && (
              <div className="flex items-center gap-4">
                {metrics.distance && (
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-semibold text-neutral-900">
                      {metrics.distance}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      miles
                    </span>
                  </div>
                )}
                {metrics.distance && metrics.vertical && (
                  <span className="text-neutral-300">•</span>
                )}
                {metrics.vertical && (
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-semibold text-neutral-900">
                      {metrics.vertical.replace(/,/g, "")}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      ft
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Brief Description */}
            {tomorrowsWorkout.description && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                {tomorrowsWorkout.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
