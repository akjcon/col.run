"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Week } from "@/lib/blocks";

interface WeekSummaryCardProps {
  week: Week;
  peakMiles: number;
  isExpanded: boolean;
  onToggle: () => void;
}

// Helper to calculate week miles
function calculateWeekMiles(week: Week): number {
  let total = 0;
  for (const day of week.days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        if (block.type === "rest") continue;
        if (block.unit === "miles") {
          total += block.value;
        } else {
          // Assume 10 min/mile for time-based blocks
          total += block.value / 10;
        }
      }
    }
  }
  return total;
}

// Find the long run distance
function getLongRunMiles(week: Week): number | null {
  for (const day of week.days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        if (block.type === "longRun") {
          if (block.unit === "miles") {
            return block.value;
          }
          return block.value / 10;
        }
      }
    }
  }
  return null;
}

// Get key workout type for the week
function getKeyWorkout(week: Week): string | null {
  const workoutTypes = new Set<string>();
  for (const day of week.days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        if (block.type === "tempo") workoutTypes.add("Tempo");
        if (block.type === "intervals") workoutTypes.add("Intervals");
      }
    }
  }
  if (workoutTypes.size === 0) return null;
  return Array.from(workoutTypes).join(", ");
}

export function WeekSummaryCard({ week, peakMiles, isExpanded, onToggle }: WeekSummaryCardProps) {
  const weekMiles = calculateWeekMiles(week);
  const longRunMiles = getLongRunMiles(week);
  const keyWorkout = getKeyWorkout(week);
  const volumePercent = peakMiles > 0 ? Math.round((weekMiles / peakMiles) * 100) : 0;

  // Phase color based on name
  const getPhaseColor = (phase: string) => {
    const lower = phase.toLowerCase();
    if (lower.includes("recovery") || lower.includes("taper")) {
      return "bg-green-50 text-green-700";
    }
    if (lower.includes("build") || lower.includes("peak")) {
      return "bg-orange-50 text-orange-700";
    }
    return "bg-blue-50 text-blue-700";
  };

  return (
    <div
      className={`border border-neutral-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer ${
        isExpanded ? "ring-2 ring-neutral-900" : ""
      }`}
      onClick={onToggle}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-neutral-900">
              Week {week.weekNumber}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPhaseColor(week.phase)}`}>
              {week.phase}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Total
            </p>
            <p className="text-xl font-semibold text-neutral-900">
              {weekMiles.toFixed(1)}
              <span className="text-sm font-normal text-neutral-500 ml-1">mi</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Long Run
            </p>
            <p className="text-xl font-semibold text-neutral-900">
              {longRunMiles ? (
                <>
                  {longRunMiles.toFixed(0)}
                  <span className="text-sm font-normal text-neutral-500 ml-1">mi</span>
                </>
              ) : (
                <span className="text-neutral-400">-</span>
              )}
            </p>
          </div>
        </div>

        {/* Key workout indicator */}
        {keyWorkout && (
          <div className="mb-3">
            <span className="text-xs px-2 py-1 bg-neutral-100 rounded text-neutral-600">
              {keyWorkout}
            </span>
          </div>
        )}

        {/* Volume progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-neutral-500 mb-1">
            <span>Volume</span>
            <span>{volumePercent}% of peak</span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all"
              style={{ width: `${Math.min(volumePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
