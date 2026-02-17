"use client";

import { useState } from "react";
import type { Week, Day } from "@/lib/blocks/types";
import {
  calculateWeekTotalMiles,
  calculateDayTotalMiles,
  calculateDayTotal,
  isRestDay,
  getDayBlocks,
  isRestBlock,
} from "@/lib/blocks/calculations";
import {
  getDayTitle,
  getDayEffortLevel,
  effortToColor,
} from "@/lib/workout-display";
import { Mountain, Zap, Timer, Check, ChevronDown } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  if (blocks.some((b) => b.type === "longRun")) return Mountain;
  if (blocks.some((b) => b.type === "intervals")) return Zap;
  if (blocks.some((b) => b.type === "tempo")) return Timer;
  return null;
}

function getDayMidnight(date: number): number {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// ── Day Row (expanded view) ─────────────────────────────────────────────────

function MobileDayRow({
  day,
  index,
  isToday,
  isPast,
  isCompleted,
}: {
  day: Day;
  index: number;
  isToday: boolean;
  isPast: boolean;
  isCompleted: boolean;
}) {
  const rest = isRestDay(day);
  const miles = calculateDayTotalMiles(day);
  const minutes = calculateDayTotal(day);
  const title = getDayTitle(day);
  const effortLevel = getDayEffortLevel(day);
  const color = effortToColor(effortLevel);
  const Icon = rest ? null : getWorkoutTypeIcon(day);

  const dateNum = day.date ? new Date(day.date).getDate() : undefined;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        isToday
          ? "ring-2 ring-neutral-900 border-transparent bg-white"
          : rest
            ? "border-neutral-100 bg-neutral-50"
            : "border-neutral-200 bg-white"
      } ${isPast && !isToday ? "opacity-50" : ""}`}
    >
      {/* Color strip */}
      {!rest && (
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Day label + date */}
      <div className="w-10 shrink-0 text-center">
        <p className={`text-[10px] uppercase ${isToday ? "font-bold text-neutral-900" : "text-neutral-400"}`}>
          {DAY_LABELS[index]}
        </p>
        <p className={`text-sm tabular-nums ${isToday ? "font-bold text-neutral-900" : "text-neutral-600"}`}>
          {dateNum}
        </p>
      </div>

      {/* Workout info */}
      <div className="min-w-0 flex-1">
        {rest ? (
          <p className="text-sm text-neutral-400">Rest</p>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {Icon && <Icon className="h-3.5 w-3.5 text-neutral-500" />}
              <p className="truncate text-sm font-medium text-neutral-800">
                {title}
              </p>
            </div>
            {miles > 0 && (
              <p className="text-xs tabular-nums text-neutral-400">
                {Math.round(miles * 10) / 10}mi
                {minutes > 0 && ` · ${formatDuration(minutes)}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Completion check */}
      {isCompleted && (
        <Check className="h-4 w-4 shrink-0 text-green-500" />
      )}
    </div>
  );
}

// ── Week Accordion ──────────────────────────────────────────────────────────

interface MobileWeekAccordionProps {
  week: Week;
  isCurrentWeek: boolean;
  todayDate: number;
  completedDates?: Set<number>;
  phaseName?: string;
}

export function MobileWeekAccordion({
  week,
  isCurrentWeek,
  todayDate,
  completedDates,
  phaseName,
}: MobileWeekAccordionProps) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const weekMiles = calculateWeekTotalMiles(week);

  // A week is past if its last day is before today
  const lastDay = week.days[week.days.length - 1];
  const isPastWeek = lastDay?.date
    ? getDayMidnight(lastDay.date) < todayDate
    : false;

  return (
    <div className={isPastWeek && !isCurrentWeek ? "opacity-50" : ""}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
          isCurrentWeek
            ? "border-neutral-200 bg-neutral-100"
            : "border-neutral-100 bg-neutral-50 hover:bg-neutral-100"
        }`}
      >
        {/* Week number */}
        <span
          className={`text-sm tabular-nums ${
            isCurrentWeek ? "font-bold text-neutral-900" : "font-medium text-neutral-500"
          }`}
        >
          W{week.weekNumber}
        </span>

        {/* 7 dots — one per day, colored by zone */}
        <div className="flex gap-1">
          {week.days.map((day, i) => {
            const rest = isRestDay(day);
            const color = rest ? "#E5E5E5" : effortToColor(getDayEffortLevel(day));
            const dayMidnight = day.date ? getDayMidnight(day.date) : null;
            const completed = dayMidnight !== null && completedDates?.has(dayMidnight);

            return (
              <div key={i} className="relative">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {completed && (
                  <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Phase + miles */}
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          {phaseName && (
            <span className="truncate text-xs text-neutral-400">
              {phaseName}
            </span>
          )}
        </div>

        <span className="shrink-0 text-xs tabular-nums text-neutral-400">
          {weekMiles > 0 ? `${Math.round(weekMiles * 10) / 10}mi` : ""}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded day list */}
      {expanded && (
        <div className="mt-1 space-y-1 pb-1">
          {week.days.map((day, i) => {
            const dayMidnight = day.date ? getDayMidnight(day.date) : null;
            const isToday = dayMidnight === todayDate;
            const isPast = dayMidnight !== null && dayMidnight < todayDate;
            const isCompleted = dayMidnight !== null && !!completedDates?.has(dayMidnight);

            return (
              <MobileDayRow
                key={i}
                day={day}
                index={i}
                isToday={isToday}
                isPast={isPast}
                isCompleted={isCompleted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
