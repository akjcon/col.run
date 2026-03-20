"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Week, EffortLevel } from "@/lib/blocks";
import { blockValueToMinutes } from "@/lib/blocks/calculations";

interface WeekSummaryCardProps {
  week: Week;
  peakMiles: number;
  isExpanded: boolean;
  onToggle: () => void;
  isRaceWeek?: boolean;
}

// Helper to calculate week miles (excludes last day if race week)
function calculateWeekMiles(week: Week, isRaceWeek?: boolean): number {
  let total = 0;
  const days = isRaceWeek ? week.days.slice(0, -1) : week.days;
  for (const day of days) {
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

// Calculate minutes per zone for the week
const ZONE_COLORS: Record<EffortLevel, string> = {
  z1: "#93C5FD", // soft blue
  z2: "#86EFAC", // soft green
  z3: "#E98A15", // brand orange
  z4: "#F87171", // red
  z5: "#171717", // near-black
};

const ZONE_LABELS: Record<EffortLevel, string> = {
  z1: "Z1",
  z2: "Z2",
  z3: "Z3",
  z4: "Z4",
  z5: "Z5",
};

function getZoneDistribution(week: Week, isRaceWeek?: boolean): { zone: EffortLevel; minutes: number }[] {
  const zones: Record<EffortLevel, number> = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const days = isRaceWeek ? week.days.slice(0, -1) : week.days;

  for (const day of days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        if (block.type === "rest") continue;
        const mins = blockValueToMinutes(block);
        zones[block.effortLevel] += mins;
      }
    }
  }

  return (["z1", "z2", "z3", "z4", "z5"] as EffortLevel[])
    .map((zone) => ({ zone, minutes: Math.round(zones[zone]) }))
    .filter((z) => z.minutes > 0);
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

export function WeekSummaryCard({ week, peakMiles, isExpanded, onToggle, isRaceWeek }: WeekSummaryCardProps) {
  const weekMiles = calculateWeekMiles(week, isRaceWeek);
  const longRunMiles = getLongRunMiles(week);
  const keyWorkout = getKeyWorkout(week);
  const volumePercent = peakMiles > 0 ? Math.round((weekMiles / peakMiles) * 100) : 0;
  const zoneDistribution = getZoneDistribution(week, isRaceWeek);
  const totalZoneMinutes = zoneDistribution.reduce((sum, z) => sum + z.minutes, 0);

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

        {/* Zone distribution */}
        {totalZoneMinutes > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Zones
            </p>
            {/* Stacked bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden mb-1.5">
              {zoneDistribution.map((z) => (
                <div
                  key={z.zone}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(z.minutes / totalZoneMinutes) * 100}%`,
                    backgroundColor: ZONE_COLORS[z.zone],
                  }}
                />
              ))}
            </div>
            {/* Labels */}
            <div className="flex gap-2 flex-wrap">
              {zoneDistribution.map((z) => (
                <span key={z.zone} className="text-[10px] tabular-nums text-neutral-500">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle"
                    style={{ backgroundColor: ZONE_COLORS[z.zone] }}
                  />
                  {ZONE_LABELS[z.zone]} {z.minutes}m
                </span>
              ))}
            </div>
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
