"use client";

import { TrainingPlan, TrainingBackground } from "@/lib/types";
import { formatRaceCountdown } from "@/lib/plan-utils";
import type { PhaseTarget } from "@/lib/agents/types";

interface PlanSummaryProps {
  plan: TrainingPlan;
  trainingBackground?: TrainingBackground;
  currentWeek: number;
  currentPhase?: PhaseTarget;
}

export function PlanSummary({
  plan,
  trainingBackground,
  currentWeek,
  currentPhase,
}: PlanSummaryProps) {
  const raceDistance = trainingBackground?.goals.raceDistance || "Training Plan";
  const raceDate = trainingBackground?.goals.raceDate;
  const countdown = formatRaceCountdown(raceDate);
  const progressPercent = Math.round((currentWeek / plan.totalWeeks) * 100);

  return (
    <div className="rounded-2xl bg-neutral-900 p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{raceDistance}</h2>
          {raceDate && (
            <p className="mt-1 text-sm text-neutral-400">{countdown}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">
            {currentWeek}
            <span className="text-lg font-normal text-neutral-400">
              /{plan.totalWeeks}
            </span>
          </p>
          <p className="text-xs text-neutral-400">weeks</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="h-2 w-full rounded-full bg-neutral-700">
          <div
            className="h-2 rounded-full bg-white transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>{progressPercent}% complete</span>
          {currentPhase && <span>{currentPhase.name}</span>}
        </div>
      </div>
    </div>
  );
}
