"use client";

import type { Day } from "@/lib/blocks/types";
import { calculateDayTotalMiles, isRestDay } from "@/lib/blocks/calculations";
import {
  getDayTitle,
  getDayEffortLevel,
  effortToColor,
} from "@/lib/workout-display";

interface DayCellProps {
  day: Day;
  isToday: boolean;
}

export function DayCell({ day, isToday }: DayCellProps) {
  const rest = isRestDay(day);
  const miles = calculateDayTotalMiles(day);
  const title = getDayTitle(day);
  const effortLevel = getDayEffortLevel(day);
  const color = effortToColor(effortLevel);

  // Format date if available
  const dateNum = day.date
    ? new Date(day.date).getDate()
    : undefined;

  return (
    <div
      className={`relative min-h-[4rem] rounded-md border p-1.5 text-left transition-colors md:min-h-[5rem] md:p-2 ${
        isToday
          ? "ring-2 ring-neutral-900 border-transparent"
          : rest
            ? "border-neutral-100 bg-neutral-50"
            : "border-neutral-200 bg-white"
      }`}
    >
      {/* Effort color strip */}
      {!rest && (
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-md"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Date number */}
      {dateNum !== undefined && (
        <p
          className={`text-[10px] tabular-nums md:text-xs ${
            isToday ? "font-bold text-neutral-900" : "text-neutral-400"
          }`}
        >
          {dateNum}
        </p>
      )}

      {/* Title */}
      <p
        className={`mt-0.5 line-clamp-1 text-[10px] leading-tight md:text-xs ${
          rest ? "text-neutral-400" : "font-medium text-neutral-800"
        }`}
      >
        {rest ? "Rest" : title}
      </p>

      {/* Miles */}
      {!rest && miles > 0 && (
        <p className="mt-0.5 text-[9px] tabular-nums text-neutral-400 md:text-[10px]">
          {Math.round(miles * 10) / 10} mi
        </p>
      )}
    </div>
  );
}
