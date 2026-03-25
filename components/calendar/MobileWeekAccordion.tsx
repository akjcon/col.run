"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Week, Day } from "@/lib/blocks/types";
import type { WorkoutLog } from "@/lib/types";
import {
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
import { Mountain, Zap, Timer, Check, ChevronDown, Flag } from "lucide-react";

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

// ── Animation constants ─────────────────────────────────────────────────────

const EASE_OUT_QUART: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

// ── Day Row (expanded view) ─────────────────────────────────────────────────

const ADHERENCE_COLORS_MOBILE = {
  on_target: "text-green-500",
  over: "text-amber-500",
  under: "text-red-500",
  skipped: "text-neutral-400",
} as const;

function MobileDayRow({
  day,
  index,
  isToday,
  isPast,
  isCompleted,
  isRaceDay,
  reducedMotion,
  coachingNote,
  adherence,
}: {
  day: Day;
  index: number;
  isToday: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isRaceDay: boolean;
  reducedMotion: boolean;
  coachingNote?: string;
  adherence?: WorkoutLog["adherence"];
}) {
  const rest = isRestDay(day);
  const miles = calculateDayTotalMiles(day);
  const minutes = calculateDayTotal(day);
  const title = getDayTitle(day);
  const effortLevel = getDayEffortLevel(day);
  const color = effortToColor(effortLevel);
  const Icon = rest ? null : getWorkoutTypeIcon(day);

  const dateNum = day.date ? new Date(day.date).getDate() : undefined;

  // Race day special rendering
  if (isRaceDay) {
    const raceDayContent = (
      <div className="relative flex items-center gap-3 rounded-lg border-2 border-[#E98A15] bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-3">
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-[#E98A15]" />

        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] uppercase tracking-wide font-bold text-[#E98A15]">
            {DAY_LABELS[index]}
          </p>
          <p className="text-sm tabular-nums font-bold text-[#E98A15]">
            {dateNum}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Flag className="h-4 w-4 text-[#E98A15]" />
          <div>
            <p className="text-sm font-bold text-neutral-900">Race Day</p>
            <p className="text-xs font-medium text-[#E98A15]">Go time.</p>
          </div>
        </div>
      </div>
    );

    if (reducedMotion) return raceDayContent;
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
      >
        {raceDayContent}
      </motion.div>
    );
  }

  const content = (
    <div
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        isToday
          ? "ring-2 ring-neutral-900 bg-white"
          : rest
            ? "bg-neutral-50/80"
            : "bg-white"
      } ${isPast && !isToday ? "opacity-50" : ""}`}
      style={
        !isToday
          ? { boxShadow: rest ? "none" : "0 0 0 1px rgba(0,0,0,0.06)" }
          : undefined
      }
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
        <p className={`text-[10px] uppercase tracking-wide ${isToday ? "font-bold text-neutral-900" : "text-neutral-400"}`}>
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
                {minutes > 0 && ` \u00B7 ${formatDuration(minutes)}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Completion check */}
      {isCompleted && (
        <Check className={`h-4 w-4 shrink-0 ${adherence ? ADHERENCE_COLORS_MOBILE[adherence] : "text-green-500"}`} />
      )}
    </div>
  );

  const wrappedContent = (
    <>
      {content}
      {coachingNote && isCompleted && (
        <div className="ml-[52px] mr-3 -mt-1 mb-1 rounded-lg bg-neutral-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-neutral-500">
            {coachingNote}
          </p>
        </div>
      )}
    </>
  );

  if (reducedMotion) return wrappedContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
    >
      {wrappedContent}
    </motion.div>
  );
}

// ── Week Accordion ──────────────────────────────────────────────────────────

interface MobileWeekAccordionProps {
  week: Week;
  isCurrentWeek: boolean;
  todayDate: number;
  completedDates?: Set<number>;
  phaseName?: string;
  raceDateMidnight?: number;
  logsByDate?: Map<number, WorkoutLog>;
}

export function MobileWeekAccordion({
  week,
  isCurrentWeek,
  todayDate,
  completedDates,
  raceDateMidnight,
  logsByDate,
}: MobileWeekAccordionProps) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const shouldReduceMotion = useReducedMotion();

  // Exclude race day from week mileage total
  const weekMiles = week.days.reduce((sum, day) => {
    if (raceDateMidnight !== undefined && day.date !== undefined) {
      if (getDayMidnight(day.date) === raceDateMidnight) return sum;
    }
    return sum + calculateDayTotalMiles(day);
  }, 0);

  // A week is past if its last day is before today
  const lastDay = week.days[week.days.length - 1];
  const isPastWeek = lastDay?.date
    ? getDayMidnight(lastDay.date) < todayDate
    : false;

  const dayRows = week.days.map((day, i) => {
    const dayMidnight = day.date ? getDayMidnight(day.date) : null;
    const isToday = dayMidnight === todayDate;
    const isPast = dayMidnight !== null && dayMidnight < todayDate;
    const isCompleted = dayMidnight !== null && !!completedDates?.has(dayMidnight);
    const isRaceDay = raceDateMidnight !== undefined && dayMidnight === raceDateMidnight;
    const log = dayMidnight !== null ? logsByDate?.get(dayMidnight) : undefined;

    return (
      <MobileDayRow
        key={i}
        day={day}
        index={i}
        isToday={isToday}
        isPast={isPast}
        isCompleted={isCompleted}
        isRaceDay={isRaceDay}
        reducedMotion={!!shouldReduceMotion}
        coachingNote={log?.coachingNote}
        adherence={log?.adherence}
      />
    );
  });

  return (
    <div className={isPastWeek && !isCurrentWeek ? "opacity-50" : ""}>
      {/* Week header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left touch-manipulation ${
          isCurrentWeek
            ? "bg-neutral-100"
            : "bg-neutral-50/80"
        }`}
        style={{
          boxShadow: isCurrentWeek
            ? "0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)"
            : "0 0 0 1px rgba(0,0,0,0.04)",
          transition: "background-color 150ms ease",
        }}
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
        <div className="flex gap-1.5">
          {week.days.map((day, i) => {
            const rest = isRestDay(day);
            const color = rest ? "#E5E5E5" : effortToColor(getDayEffortLevel(day));
            const dayMidnight = day.date ? getDayMidnight(day.date) : null;
            const completed = dayMidnight !== null && completedDates?.has(dayMidnight);
            const dayLog = dayMidnight !== null ? logsByDate?.get(dayMidnight) : undefined;
            const dotColor = dayLog?.adherence === "over"
              ? "bg-amber-500"
              : dayLog?.adherence === "under"
                ? "bg-red-500"
                : "bg-green-500";

            return (
              <div key={i} className="relative">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {completed && (
                  <div className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        <span className="shrink-0 text-xs tabular-nums text-neutral-400">
          {weekMiles > 0 ? `${Math.round(weekMiles * 10) / 10}mi` : ""}
        </span>

        <ChevronDown
          className="h-4 w-4 shrink-0 text-neutral-400"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms cubic-bezier(0.165, 0.84, 0.44, 1)",
          }}
        />
      </button>

      {/* Expanded day list */}
      {shouldReduceMotion ? (
        expanded && (
          <div className="mt-1.5 space-y-1 px-0.5 pb-1">
            {dayRows}
          </div>
        )
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
              style={{ overflow: "hidden" }}
            >
              <div className="space-y-1 px-0.5 pb-1 pt-1.5">
                {dayRows}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
