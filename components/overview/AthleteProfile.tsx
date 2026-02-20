"use client";

import type { TrainingBackground, AthleteSnapshot } from "@/lib/types";
import type { Week } from "@/lib/blocks/types";
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";

interface AthleteProfileProps {
  trainingBackground: TrainingBackground;
  snapshot?: AthleteSnapshot | null;
  currentWeekData?: Week;
  totalPlanMiles?: number;
}

function Stat({
  label,
  value,
  context,
  contextColor,
}: {
  label: string;
  value: string;
  context?: string;
  contextColor?: string;
}) {
  return (
    <div>
      <p className="text-lg font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
      {context && (
        <p className="mt-0.5 text-xs font-medium" style={{ color: contextColor ?? "#737373" }}>
          {context}
        </p>
      )}
    </div>
  );
}

function getFitnessLabel(ctl: number): { text: string; color: string } {
  if (ctl >= 75) return { text: "Peak fitness", color: "#16a34a" };
  if (ctl >= 50) return { text: "Well trained", color: "#16a34a" };
  if (ctl >= 25) return { text: "Building", color: "#E98A15" };
  return { text: "Base phase", color: "#737373" };
}

function getFatigueLabel(atl: number): { text: string; color: string } {
  if (atl >= 80) return { text: "Very high", color: "#dc2626" };
  if (atl >= 50) return { text: "High", color: "#E98A15" };
  if (atl >= 25) return { text: "Moderate", color: "#737373" };
  return { text: "Low", color: "#16a34a" };
}

function getFormLabel(tsb: number): { text: string; color: string } {
  if (tsb < -20) return { text: "Overreaching", color: "#dc2626" };
  if (tsb < -10) return { text: "Absorbing load", color: "#E98A15" };
  if (tsb <= 5) return { text: "Neutral", color: "#737373" };
  if (tsb <= 25) return { text: "Fresh", color: "#16a34a" };
  return { text: "Detraining risk", color: "#E98A15" };
}

export function AthleteProfile({
  trainingBackground,
  snapshot,
  currentWeekData,
  totalPlanMiles,
}: AthleteProfileProps) {
  const experience = trainingBackground.experience;
  const weeklyMileage = snapshot?.currentWeeklyMileage ?? trainingBackground.weeklyMileage;
  const longestRun = trainingBackground.longestRun;
  const marathonPR = trainingBackground.marathonPR;
  const goals = trainingBackground.goals;
  const currentWeekMiles = currentWeekData
    ? Math.round(calculateWeekTotalMiles(currentWeekData))
    : null;

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-brand" />
        <h3 className="text-sm font-semibold text-neutral-900">Athlete</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Experience"
          value={experience.charAt(0).toUpperCase() + experience.slice(1)}
        />
        <Stat label="Weekly Mileage" value={`${weeklyMileage} mi`} />
        <Stat label="Longest Run" value={`${longestRun} mi`} />
        {marathonPR && <Stat label="Marathon PR" value={marathonPR} />}
      </div>

      {/* Strava fitness metrics */}
      {snapshot?.ctl != null && (
        <div className="mt-4 border-t border-brand/10 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Training Load
            </p>
            <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/powered-by-strava.svg" alt="Powered by Strava" className="h-5" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const fitness = getFitnessLabel(snapshot.ctl!);
              const fatigue = getFatigueLabel(snapshot.atl!);
              const form = getFormLabel(snapshot.tsb!);
              return (
                <>
                  <Stat
                    label="Fitness"
                    value={`${snapshot.ctl}`}
                    context={fitness.text}
                    contextColor={fitness.color}
                  />
                  <Stat
                    label="Fatigue"
                    value={`${snapshot.atl}`}
                    context={fatigue.text}
                    contextColor={fatigue.color}
                  />
                  <Stat
                    label="Form"
                    value={`${snapshot.tsb}`}
                    context={form.text}
                    contextColor={form.color}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* This week vs baseline */}
      {currentWeekMiles !== null && (
        <div className="mt-4 border-t border-brand/10 pt-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label="This Week" value={`${currentWeekMiles} mi`} />
            <Stat label="Baseline" value={`${trainingBackground.weeklyMileage} mi/wk`} />
            {totalPlanMiles !== undefined && (
              <Stat label="Total Plan" value={`${Math.round(totalPlanMiles)} mi`} />
            )}
          </div>
        </div>
      )}

      {/* Goal */}
      {goals && (
        <div className="mt-4 border-t border-brand/10 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Goal
          </p>
          <p className="text-sm font-medium text-neutral-900">
            {goals.raceDistance}
            {goals.targetTime && (
              <span className="ml-2 text-neutral-500">
                Target: {goals.targetTime}
              </span>
            )}
          </p>
          {goals.description && (
            <p className="mt-1 text-sm text-neutral-600">
              {goals.description}
            </p>
          )}
          {goals.elevation && goals.elevation > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              {goals.elevation.toLocaleString()} ft elevation gain
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {(trainingBackground.injuries || trainingBackground.specialNotes) && (
        <div className="mt-4 border-t border-brand/10 pt-4">
          {trainingBackground.injuries && (
            <div className="mb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Injuries / Limitations
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {trainingBackground.injuries}
              </p>
            </div>
          )}
          {trainingBackground.specialNotes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Notes
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {trainingBackground.specialNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
