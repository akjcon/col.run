"use client";

import { Wand2, Check, X, Loader2 } from "lucide-react";
import { useUser } from "@/lib/user-context-rtk";
import type { PlanModificationData } from "@/lib/chat-context";
import {
  calculateWeekTotalMiles,
  calculateDayTotalMiles,
  isRestDay,
} from "@/lib/blocks/calculations";
import type { Day, Week } from "@/lib/blocks/types";

interface PlanChangeCardProps {
  modification: PlanModificationData;
  messageId?: string;
  onApply: () => void;
  onDismiss: () => void;
}

function formatDayBrief(day: Day): string {
  if (isRestDay(day)) return "Rest";
  const miles = calculateDayTotalMiles(day);
  const mainBlock = day.workouts
    .flatMap((w) => w.blocks)
    .find((b) => b.type !== "rest" && b.type !== "warmUp" && b.type !== "coolDown");
  const type = mainBlock?.type || "easy";
  const label =
    type === "longRun"
      ? "Long Run"
      : type === "intervals"
        ? "Intervals"
        : type === "tempo"
          ? "Tempo"
          : type === "easy"
            ? "Easy"
            : type === "recovery"
              ? "Recovery"
              : type;
  return `${label} ${miles.toFixed(1)}mi`;
}

function SingleWeekDisplay({
  week,
  label,
  oldMiles,
  summary,
}: {
  week: Week;
  label: string;
  oldMiles: number | null;
  summary?: string;
}) {
  const newMiles = calculateWeekTotalMiles(week);
  const delta = oldMiles !== null ? ((newMiles - oldMiles) / oldMiles) * 100 : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-neutral-800">
          {label} — {week.phase}
        </span>
        {oldMiles !== null && delta !== null ? (
          <span className="text-[10px] text-neutral-500">
            {oldMiles.toFixed(0)}mi → {newMiles.toFixed(0)}mi (
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(0)}%)
          </span>
        ) : (
          <span className="text-[10px] text-neutral-500">
            {newMiles.toFixed(0)}mi (added)
          </span>
        )}
      </div>
      {summary && <p className="text-[11px] text-neutral-500">{summary}</p>}
      <div className="grid grid-cols-7 gap-0.5">
        {week.days.map((day) => (
          <div key={day.dayOfWeek} className="text-center">
            <div className="text-[9px] text-neutral-400">
              {day.dayOfWeek.slice(0, 3)}
            </div>
            <div className="truncate text-[10px] text-neutral-700">
              {formatDayBrief(day)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekChangeSummary({
  change,
  currentWeek,
}: {
  change: PlanModificationData["changes"][0];
  currentWeek?: Week;
}) {
  if (change.type === "replace_week") {
    const oldMiles = currentWeek ? calculateWeekTotalMiles(currentWeek) : null;
    return (
      <SingleWeekDisplay
        week={change.week}
        label={`Week ${change.weekNumber}`}
        oldMiles={oldMiles}
        summary={change.summary}
      />
    );
  }

  if (change.type === "append_weeks" && change.weeks.length > 0) {
    return (
      <div className="space-y-2.5">
        <p className="text-[11px] font-medium text-neutral-600">
          {change.summary}
        </p>
        {change.weeks.map((week, i) => (
          <SingleWeekDisplay
            key={`${change.weekNumber}-${i}`}
            week={week}
            label={`New Week ${change.weekNumber + i}`}
            oldMiles={null}
          />
        ))}
      </div>
    );
  }

  return null;
}

function DayChangeSummary({
  change,
  currentDay,
}: {
  change: PlanModificationData["changes"][0];
  currentDay?: Day;
}) {
  if (change.type !== "replace_day" || !change.day) return null;

  const newMiles = calculateDayTotalMiles(change.day);
  const oldMiles = currentDay ? calculateDayTotalMiles(currentDay) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-neutral-800">
          {change.dayOfWeek} (Week {change.weekNumber})
        </span>
        {oldMiles !== null && (
          <span className="text-[10px] text-neutral-500">
            {oldMiles.toFixed(1)}mi → {newMiles.toFixed(1)}mi
          </span>
        )}
      </div>
      <p className="text-[11px] text-neutral-500">{change.summary}</p>
      <div className="text-[11px] text-neutral-700">
        {formatDayBrief(change.day)}
        {currentDay && (
          <span className="text-neutral-400">
            {" "}← was {formatDayBrief(currentDay)}
          </span>
        )}
      </div>
    </div>
  );
}

export function PlanChangeCard({
  modification,
  onApply,
  onDismiss,
}: PlanChangeCardProps) {
  const { userData } = useUser();
  const activePlan = userData?.activePlan;
  // Loading state derives from the modification status the parent owns —
  // no local mirror needed. Lets the parent (or an affirmative reply in
  // the chat) drive the same state transition.
  const isApplying = modification.status === "applying";

  // Find current weeks/days for comparison
  const getCurrentWeek = (weekNum: number): Week | undefined =>
    activePlan?.weeks?.find((w) => w.weekNumber === weekNum);

  const getCurrentDay = (weekNum: number, dayOfWeek: string): Day | undefined =>
    getCurrentWeek(weekNum)?.days?.find((d) => d.dayOfWeek === dayOfWeek);

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
        {modification.status === "applied" ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Wand2 className="h-3.5 w-3.5 text-neutral-500" />
        )}
        <span className="text-xs font-medium text-neutral-700">
          {modification.status === "applied"
            ? "Changes Applied"
            : modification.status === "error"
              ? "Changes Not Applied"
              : "Proposed Plan Changes"}
        </span>
      </div>

      {/* Changes */}
      <div className="space-y-3 px-3 py-2">
        {modification.changes.map((change, i) => {
          // Render the body for this change. Skip the wrapper entirely if
          // there's no body to render (e.g. malformed append_weeks with
          // empty weeks) — otherwise an empty <div> + separator appears.
          let body: React.ReactNode = null;
          if (change.type === "replace_week" || change.type === "append_weeks") {
            body = (
              <WeekChangeSummary
                change={change}
                currentWeek={
                  change.type === "append_weeks"
                    ? undefined
                    : getCurrentWeek(change.weekNumber)
                }
              />
            );
          } else if (change.type === "replace_day") {
            body = (
              <DayChangeSummary
                change={change}
                currentDay={getCurrentDay(change.weekNumber, change.dayOfWeek)}
              />
            );
          }
          if (!body) return null;
          return (
            <div key={i}>
              {body}
              {i < modification.changes.length - 1 && (
                <div className="mt-2 border-t border-neutral-100" />
              )}
            </div>
          );
        })}
      </div>

      {/* Evaluation score (shown after apply) */}
      {modification.evaluation && (
        <div className="border-t border-neutral-200 px-3 py-2">
          <div className="flex items-center gap-3 text-[10px] text-neutral-500">
            <span>Plan Score: {modification.evaluation.overall}/100</span>
            <span>Safety: {modification.evaluation.safety}</span>
            <span>Method: {modification.evaluation.methodology}</span>
          </div>
        </div>
      )}

      {/* Validation warnings (some changes dropped) */}
      {modification.validationWarnings && modification.validationWarnings.length > 0 && (
        <div className="border-t border-neutral-200 px-3 py-2">
          <p className="text-[11px] font-medium text-amber-600">Some changes could not be applied:</p>
          <ul className="mt-0.5 list-disc pl-3">
            {modification.validationWarnings.map((w, i) => (
              <li key={i} className="text-[10px] text-amber-600">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error message */}
      {modification.status === "error" && modification.error && (
        <div className="border-t border-neutral-200 px-3 py-2">
          <p className="text-[11px] text-red-600">{modification.error}</p>
        </div>
      )}

      {/* Actions */}
      {modification.status === "proposed" && (
        <div className="flex gap-2 border-t border-neutral-200 px-3 py-2">
          <button
            onClick={onApply}
            disabled={isApplying || !activePlan}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#E98A15] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#d47d13] disabled:opacity-50"
          >
            {isApplying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Apply Changes
          </button>
          <button
            onClick={onDismiss}
            disabled={isApplying}
            className="flex items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            <X className="h-3 w-3" />
            Keep Current
          </button>
        </div>
      )}

      {/* Applying state */}
      {modification.status === "applying" && (
        <div className="flex items-center justify-center gap-2 border-t border-neutral-200 px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
          <span className="text-xs text-neutral-500">Applying changes...</span>
        </div>
      )}
    </div>
  );
}
