"use client";

import type { Week } from "@/lib/blocks/types";
import { calculateWeekDistribution } from "@/lib/blocks/calculations";

interface TrainingDistributionProps {
  weeks: Week[];
  currentWeek: number;
}

function DistributionBar({
  label,
  easyPercent,
  hardPercent,
}: {
  label: string;
  easyPercent: number;
  hardPercent: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-neutral-600">{label}</span>
        <span className="tabular-nums text-neutral-400">
          {Math.round(easyPercent)}% / {Math.round(hardPercent)}%
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-neutral-300 transition-all"
          style={{ width: `${easyPercent}%` }}
        />
        <div
          className="bg-neutral-800 transition-all"
          style={{ width: `${hardPercent}%` }}
        />
      </div>
    </div>
  );
}

export function TrainingDistribution({
  weeks,
  currentWeek,
}: TrainingDistributionProps) {
  // Current week distribution
  const currentWeekData = weeks.find((w) => w.weekNumber === currentWeek);
  const currentDist = currentWeekData
    ? calculateWeekDistribution(currentWeekData)
    : { easy: 0, hard: 0, total: 0 };

  // Overall plan distribution
  const overallDist = weeks.reduce(
    (acc, w) => {
      const d = calculateWeekDistribution(w);
      return {
        easy: acc.easy + d.easy,
        hard: acc.hard + d.hard,
        total: acc.total + d.total,
      };
    },
    { easy: 0, hard: 0, total: 0 }
  );

  const currentEasyPct =
    currentDist.total > 0 ? (currentDist.easy / currentDist.total) * 100 : 0;
  const currentHardPct =
    currentDist.total > 0 ? (currentDist.hard / currentDist.total) * 100 : 0;

  const overallEasyPct =
    overallDist.total > 0 ? (overallDist.easy / overallDist.total) * 100 : 0;
  const overallHardPct =
    overallDist.total > 0 ? (overallDist.hard / overallDist.total) * 100 : 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">
        Easy / Hard Distribution
      </h3>

      <div className="space-y-4">
        <DistributionBar
          label={`Week ${currentWeek}`}
          easyPercent={currentEasyPct}
          hardPercent={currentHardPct}
        />
        <DistributionBar
          label="Overall Plan"
          easyPercent={overallEasyPct}
          hardPercent={overallHardPct}
        />
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] text-neutral-400">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-neutral-300" />
          Easy
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
          Hard
        </div>
        <span className="ml-auto">Target: ~80% easy / 20% hard</span>
      </div>
    </div>
  );
}
