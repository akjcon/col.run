"use client";

import type { Day } from "@/lib/blocks/types";
import { calculateDayTotalMiles, calculateDayTotal, isRestDay, getDayBlocks, isRestBlock } from "@/lib/blocks/calculations";
import {
  getDayTitle,
  getDayEffortLevel,
  effortToColor,
} from "@/lib/workout-display";
import { Mountain, Zap, Timer, Check } from "lucide-react";

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `~${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `~${h}h${m}m` : `~${h}h`;
}

function getWorkoutTypeIcon(day: Day) {
  const blocks = getDayBlocks(day).filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return null;

  const hasLongRun = blocks.some((b) => b.type === "longRun");
  const hasIntervals = blocks.some((b) => b.type === "intervals");
  const hasTempo = blocks.some((b) => b.type === "tempo");

  if (hasLongRun) return Mountain;
  if (hasIntervals) return Zap;
  if (hasTempo) return Timer;
  return null;
}

interface DayCellProps {
  day: Day;
  isToday: boolean;
  isPast: boolean;
  isCompleted: boolean;
}

export function DayCell({ day, isToday, isPast, isCompleted }: DayCellProps) {
  const rest = isRestDay(day);
  const miles = calculateDayTotalMiles(day);
  const minutes = calculateDayTotal(day);
  const title = getDayTitle(day);
  const effortLevel = getDayEffortLevel(day);
  const color = effortToColor(effortLevel);
  const Icon = rest ? null : getWorkoutTypeIcon(day);

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
      } ${isPast && !isToday ? "opacity-50" : ""}`}
    >
      {/* Effort color strip */}
      {!rest && (
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-md"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Date number + completion check */}
      {dateNum !== undefined && (
        <div className="flex items-center gap-0.5">
          <p
            className={`text-[10px] tabular-nums md:text-xs ${
              isToday ? "font-bold text-neutral-900" : "text-neutral-400"
            }`}
          >
            {dateNum}
          </p>
          {isCompleted && (
            <Check className="h-2.5 w-2.5 text-green-500" />
          )}
        </div>
      )}

      {/* Title with micro-icon */}
      <p
        className={`mt-0.5 line-clamp-1 text-[10px] leading-tight md:text-xs ${
          rest ? "text-neutral-400" : "font-medium text-neutral-800"
        }`}
      >
        {Icon && (
          <Icon className="mr-0.5 hidden md:inline-block h-3 w-3" />
        )}
        {rest ? "Rest" : title}
      </p>

      {/* Miles (mobile) + Duration (desktop only) */}
      {!rest && miles > 0 && (
        <p className="mt-0.5 text-[9px] tabular-nums text-neutral-400 md:text-[10px]">
          {Math.round(miles * 10) / 10}mi
          {minutes > 0 && (
            <span className="hidden md:inline"> · {formatDuration(minutes)}</span>
          )}
        </p>
      )}
    </div>
  );
}
