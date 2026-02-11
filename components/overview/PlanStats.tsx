"use client";

import type { Week } from "@/lib/blocks/types";
import {
  calculateWeekTotalMiles,
  countRestDays,
  countHardDays,
  isRestDay,
} from "@/lib/blocks/calculations";

interface PlanStatsProps {
  weeks: Week[];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export function PlanStats({ weeks }: PlanStatsProps) {
  const weekMiles = weeks.map((w) => calculateWeekTotalMiles(w));
  const totalMiles = weekMiles.reduce((sum, m) => sum + m, 0);
  const peakMiles = Math.max(...weekMiles, 0);
  const avgMiles = weeks.length > 0 ? totalMiles / weeks.length : 0;

  // Average rest days per week
  const totalRestDays = weeks.reduce((sum, w) => sum + countRestDays(w), 0);
  const avgRestDays = weeks.length > 0 ? totalRestDays / weeks.length : 0;

  // Average hard days per week
  const totalHardDays = weeks.reduce((sum, w) => sum + countHardDays(w), 0);
  const avgHardDays = weeks.length > 0 ? totalHardDays / weeks.length : 0;

  // Average training days per week (non-rest)
  const totalTrainingDays = weeks.reduce(
    (sum, w) => sum + w.days.filter((d) => !isRestDay(d)).length,
    0
  );
  const avgTrainingDays =
    weeks.length > 0 ? totalTrainingDays / weeks.length : 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">
        Plan Stats
      </h3>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatCard label="Total Miles" value={`${Math.round(totalMiles)}`} />
        <StatCard label="Peak Week" value={`${Math.round(peakMiles)} mi`} />
        <StatCard label="Avg Week" value={`${Math.round(avgMiles)} mi`} />
        <StatCard
          label="Rest Days/Wk"
          value={avgRestDays.toFixed(1)}
        />
        <StatCard
          label="Hard Days/Wk"
          value={avgHardDays.toFixed(1)}
        />
        <StatCard
          label="Training Days/Wk"
          value={avgTrainingDays.toFixed(1)}
        />
      </div>
    </div>
  );
}
