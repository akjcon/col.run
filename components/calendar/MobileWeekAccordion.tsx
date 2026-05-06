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
  formatBlockWithPace,
} from "@/lib/workout-display";
import { Mountain, Zap, Timer, Check, CheckCircle2, ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { easing } from "@/lib/animation";
import { toNoonUTC } from "@/lib/workout-utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_TRACK_HEIGHT = 32;
const BAR_MIN_HEIGHT = 5;
const REST_NUB_HEIGHT = 4;

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

// ── Volume Bar (collapsed week summary) ──────────────────────────────────────

type DayBarState =
  | { kind: "rest" }
  | { kind: "race"; miles: number }
  | { kind: "completed"; miles: number; color: string; adherence?: WorkoutLog["adherence"] }
  | { kind: "skipped"; miles: number; color: string }
  | { kind: "planned"; miles: number; color: string };

function dayBarState(args: {
  day: Day;
  miles: number;
  isPast: boolean;
  isCompleted: boolean;
  isRaceDay: boolean;
  adherence?: WorkoutLog["adherence"];
}): DayBarState {
  const { day, miles, isPast, isCompleted, isRaceDay, adherence } = args;
  if (isRaceDay) return { kind: "race", miles };
  if (isRestDay(day) || miles <= 0) return { kind: "rest" };
  const color = effortToColor(getDayEffortLevel(day));
  if (isCompleted) return { kind: "completed", miles, color, adherence };
  if (isPast) return { kind: "skipped", miles, color };
  return { kind: "planned", miles, color };
}

function VolumeBar({
  state,
  maxMiles,
}: {
  state: DayBarState;
  maxMiles: number;
}) {
  if (state.kind === "rest") {
    return (
      <div
        className="flex w-1.5 items-end justify-center"
        style={{ height: BAR_TRACK_HEIGHT }}
      >
        <div
          className="w-1.5 rounded-full bg-neutral-200"
          style={{ height: REST_NUB_HEIGHT }}
        />
      </div>
    );
  }

  const ratio = maxMiles > 0 ? state.miles / maxMiles : 0;
  const height = Math.max(
    BAR_MIN_HEIGHT,
    Math.min(BAR_TRACK_HEIGHT, ratio * BAR_TRACK_HEIGHT)
  );

  let background: string;
  let opacity = 1;
  if (state.kind === "race") {
    background = "#E98A15"; // brand
  } else if (state.kind === "completed") {
    if (state.adherence === "over") background = "#F59E0B"; // amber-500
    else if (state.adherence === "under") background = "#EF4444"; // red-500
    else background = state.color;
  } else if (state.kind === "skipped") {
    background = "#D4D4D4"; // neutral-300
  } else {
    // planned (future or today-pending) — soft but still alive
    background = state.color;
    opacity = 0.55;
  }

  return (
    <div
      className="flex w-1.5 items-end justify-center"
      style={{ height: BAR_TRACK_HEIGHT }}
    >
      <div
        className="w-1.5 rounded-full"
        style={{ height, backgroundColor: background, opacity }}
      />
    </div>
  );
}

// ── Workout Detail (inline expansion of a single day) ───────────────────────

function WorkoutDetail({
  day,
  thresholdPace,
  coachingNote,
}: {
  day: Day;
  thresholdPace?: number;
  coachingNote?: string;
}) {
  const blocks = day.workouts.flatMap((w) =>
    w.blocks.filter((b) => !isRestBlock(b))
  );
  if (blocks.length === 0) return null;

  const blockNotes = blocks
    .map((b) => b.notes)
    .filter((n): n is string => !!n);

  return (
    <div className="ml-[52px] mr-3 mt-1 rounded-lg bg-neutral-50 px-3 py-3">
      <ul className="space-y-2">
        {blocks.map((block, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: effortToColor(block.effortLevel) }}
            />
            <p className="text-[13px] leading-snug text-neutral-700">
              {formatBlockWithPace(block, thresholdPace)}
            </p>
          </li>
        ))}
      </ul>
      {blockNotes.length > 0 && (
        <p className="mt-3 border-t border-neutral-200 pt-2 text-xs leading-relaxed text-neutral-500">
          {blockNotes.join(" ")}
        </p>
      )}
      {coachingNote && (
        <div className="mt-3 border-t border-neutral-200 pt-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Coach&apos;s Note
          </p>
          <p className="text-xs leading-relaxed text-neutral-600">
            {coachingNote}
          </p>
        </div>
      )}
    </div>
  );
}

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
  adherence,
  coachingNote,
  isDetailOpen,
  onToggleDetail,
  thresholdPace,
}: {
  day: Day;
  index: number;
  isToday: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isRaceDay: boolean;
  reducedMotion: boolean;
  adherence?: WorkoutLog["adherence"];
  coachingNote?: string;
  isDetailOpen: boolean;
  onToggleDetail: () => void;
  thresholdPace?: number;
}) {
  const rest = isRestDay(day);
  const miles = calculateDayTotalMiles(day, thresholdPace);
  const minutes = calculateDayTotal(day, thresholdPace);
  const title = getDayTitle(day);
  const effortLevel = getDayEffortLevel(day);
  const color = effortToColor(effortLevel);
  const Icon = rest ? null : getWorkoutTypeIcon(day);
  const canExpand = !rest && !isRaceDay && day.workouts.length > 0;

  const dateNum = day.date ? new Date(day.date).getDate() : undefined;

  // Race day special rendering
  if (isRaceDay) {
    const raceDayContent = (
      <div className="relative flex items-center gap-3 rounded-lg border-2 border-brand bg-linear-to-r from-orange-50 to-amber-50 px-3 py-3">
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-brand" />

        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand">
            {DAY_LABELS[index]}
          </p>
          <p className="text-sm font-bold tabular-nums text-brand">{dateNum}</p>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <Flag className="h-4 w-4 text-brand" />
          <div>
            <p className="text-sm font-bold text-neutral-900">Race Day</p>
            <p className="text-xs font-medium text-brand">Go time.</p>
          </div>
        </div>
      </div>
    );

    if (reducedMotion) return raceDayContent;
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: easing.outQuart }}
      >
        {raceDayContent}
      </motion.div>
    );
  }

  const rowInner = (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5",
        isToday ? "bg-orange-50" : rest ? "bg-neutral-50/80" : "bg-white",
        isPast && !isToday && !isCompleted && "opacity-55",
        isDetailOpen && "rounded-b-none"
      )}
      style={{
        boxShadow: rest || isToday ? "none" : "0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Color strip — effort color */}
      {!rest && (
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="w-10 shrink-0 text-center">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            isToday ? "text-brand" : "text-neutral-400"
          )}
        >
          {DAY_LABELS[index]}
        </p>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isToday ? "text-brand" : "text-neutral-600"
          )}
        >
          {dateNum}
        </p>
      </div>

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

      {isCompleted ? (
        <Check
          className={cn(
            "h-4 w-4 shrink-0",
            adherence ? ADHERENCE_COLORS_MOBILE[adherence] : "text-green-500"
          )}
        />
      ) : canExpand ? (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ease-out",
            isDetailOpen && "rotate-180"
          )}
        />
      ) : null}
    </div>
  );

  const row = canExpand ? (
    <button
      type="button"
      onClick={onToggleDetail}
      className="block w-full touch-manipulation text-left"
      aria-expanded={isDetailOpen}
    >
      {rowInner}
    </button>
  ) : (
    rowInner
  );

  const detail = canExpand ? (
    reducedMotion ? (
      isDetailOpen && <WorkoutDetail day={day} thresholdPace={thresholdPace} coachingNote={coachingNote} />
    ) : (
      <AnimatePresence initial={false}>
        {isDetailOpen && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: easing.outQuart }}
            style={{ overflow: "hidden" }}
          >
            <WorkoutDetail day={day} thresholdPace={thresholdPace} coachingNote={coachingNote} />
          </motion.div>
        )}
      </AnimatePresence>
    )
  ) : null;

  const wrappedContent = (
    <>
      {row}
      {detail}
    </>
  );

  if (reducedMotion) return wrappedContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: easing.outQuart }}
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
  thresholdPace?: number;
}

export function MobileWeekAccordion({
  week,
  isCurrentWeek,
  todayDate,
  completedDates,
  raceDateMidnight,
  logsByDate,
  thresholdPace,
}: MobileWeekAccordionProps) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Per-day computation reused by both the bar chart and the row list
  const dayMeta = week.days.map((day, i) => {
    const dayMidnight = day.date ? toNoonUTC(day.date) : null;
    const isToday = dayMidnight === todayDate;
    const isPast = dayMidnight !== null && dayMidnight < todayDate;
    const isCompleted = dayMidnight !== null && !!completedDates?.has(dayMidnight);
    const isRaceDay =
      raceDateMidnight !== undefined && dayMidnight === raceDateMidnight;
    const log = dayMidnight !== null ? logsByDate?.get(dayMidnight) : undefined;
    const miles = isRaceDay ? 0 : calculateDayTotalMiles(day, thresholdPace);
    return {
      day,
      index: i,
      isToday,
      isPast,
      isCompleted,
      isRaceDay,
      log,
      miles,
    };
  });

  // Week totals — exclude race day from planned mileage
  const plannedMiles = dayMeta.reduce(
    (sum, d) => (d.isRaceDay ? sum : sum + d.miles),
    0
  );
  const completedMiles = dayMeta.reduce(
    (sum, d) => (d.isCompleted && !d.isRaceDay ? sum + d.miles : sum),
    0
  );
  const hasAnyCompletion = dayMeta.some((d) => d.isCompleted);
  const percentDone =
    plannedMiles > 0
      ? Math.min(100, Math.round((completedMiles / plannedMiles) * 100))
      : 0;
  const showPercent = hasAnyCompletion && plannedMiles > 0;

  // Bar chart needs the max miles in the week to normalize heights
  const maxMiles = dayMeta.reduce(
    (m, d) => (d.miles > m ? d.miles : m),
    0
  );

  // A week is "complete" when every non-rest, non-race day has a log
  const plannedDayCount = dayMeta.filter(
    (d) => !d.isRaceDay && !isRestDay(d.day)
  ).length;
  const completedDayCount = dayMeta.filter(
    (d) => d.isCompleted && !d.isRaceDay && !isRestDay(d.day)
  ).length;
  const weekIsComplete =
    plannedDayCount > 0 && completedDayCount === plannedDayCount;

  const dayRows = dayMeta.map((d) => (
    <MobileDayRow
      key={d.index}
      day={d.day}
      index={d.index}
      isToday={d.isToday}
      isPast={d.isPast}
      isCompleted={d.isCompleted}
      isRaceDay={d.isRaceDay}
      reducedMotion={!!shouldReduceMotion}
      adherence={d.log?.adherence}
      coachingNote={d.log?.coachingNote}
      isDetailOpen={expandedDayIndex === d.index}
      onToggleDetail={() =>
        setExpandedDayIndex((prev) => (prev === d.index ? null : d.index))
      }
      thresholdPace={thresholdPace}
    />
  ));

  return (
    <div>
      {/* Week header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "relative flex w-full touch-manipulation items-center gap-3 rounded-2xl px-4 py-3.5 text-left",
          "transition-[background-color,box-shadow] duration-150 ease-out",
          isCurrentWeek
            ? "bg-orange-50 shadow-[0_2px_8px_rgba(233,138,21,0.14),0_0_0_1px_rgba(233,138,21,0.22)]"
            : "bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
        )}
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            isCurrentWeek ? "text-brand" : "text-neutral-700"
          )}
        >
          W{week.weekNumber}
        </span>

        {/* 7 bars — one per day, height = volume */}
        <div className="flex shrink-0 items-end gap-1">
          {dayMeta.map((d) => (
            <VolumeBar
              key={d.index}
              state={dayBarState({
                day: d.day,
                miles: d.miles,
                isPast: d.isPast,
                isCompleted: d.isCompleted,
                isRaceDay: d.isRaceDay,
                adherence: d.log?.adherence,
              })}
              maxMiles={maxMiles}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Mileage + status */}
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold leading-none tracking-tight tabular-nums text-neutral-900">
            {plannedMiles > 0
              ? `${Math.round(plannedMiles * 10) / 10}`
              : "—"}
            <span className="ml-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              mi
            </span>
          </div>
          {showPercent && (
            <div
              className={cn(
                "mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                weekIsComplete ? "text-green-600" : "text-neutral-500"
              )}
            >
              {weekIsComplete && (
                <CheckCircle2 className="h-3 w-3 fill-green-500 text-white" />
              )}
              <span>
                {weekIsComplete ? "Complete" : `${percentDone}% Done`}
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded day list */}
      {shouldReduceMotion ? (
        expanded && (
          <div className="mt-1.5 space-y-1 px-0.5 pb-1">{dayRows}</div>
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
              transition={{ duration: 0.25, ease: easing.outQuart }}
              style={{ overflow: "hidden" }}
            >
              <div className="space-y-1 px-0.5 pb-1 pt-1.5">{dayRows}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

