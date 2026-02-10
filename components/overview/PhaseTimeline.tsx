"use client";

import type { PhaseTarget } from "@/lib/agents/types";

interface PhaseTimelineProps {
  phases: PhaseTarget[];
  totalWeeks: number;
  currentWeek: number;
}

const PHASE_COLORS = [
  "bg-neutral-300",
  "bg-neutral-400",
  "bg-neutral-500",
  "bg-neutral-600",
  "bg-neutral-700",
  "bg-neutral-800",
];

export function PhaseTimeline({
  phases,
  totalWeeks,
  currentWeek,
}: PhaseTimelineProps) {
  if (!phases || phases.length === 0) return null;

  // Position of current week marker as percentage
  const currentPercent = ((currentWeek - 0.5) / totalWeeks) * 100;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">
        Phase Timeline
      </h3>

      <div className="relative">
        {/* Phase segments */}
        <div className="flex h-6 w-full overflow-hidden rounded-full">
          {phases.map((phase, i) => {
            const span = phase.endWeek - phase.startWeek + 1;
            const widthPercent = (span / totalWeeks) * 100;
            return (
              <div
                key={i}
                className={`${PHASE_COLORS[i % PHASE_COLORS.length]} relative`}
                style={{ width: `${widthPercent}%` }}
              />
            );
          })}
        </div>

        {/* Current week marker */}
        <div
          className="absolute top-0 h-6 w-0.5 bg-[#E98A15]"
          style={{ left: `${Math.min(currentPercent, 100)}%` }}
        />

        {/* Phase labels */}
        <div className="mt-2 flex">
          {phases.map((phase, i) => {
            const span = phase.endWeek - phase.startWeek + 1;
            const widthPercent = (span / totalWeeks) * 100;
            return (
              <div
                key={i}
                className="overflow-hidden text-ellipsis whitespace-nowrap px-0.5"
                style={{ width: `${widthPercent}%` }}
              >
                <p className="truncate text-[10px] text-neutral-500">
                  {phase.name}
                </p>
                <p className="text-[9px] text-neutral-400">
                  W{phase.startWeek}-{phase.endWeek}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
