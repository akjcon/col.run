import { Calendar, TrendingUp } from "lucide-react";

interface ProgressOverviewProps {
  currentWeek: number;
  totalWeeks: number;
  currentPhase?: {
    phase: string;
    weeks: string;
  };
}

export function ProgressOverview({
  currentWeek,
  totalWeeks,
  currentPhase,
}: ProgressOverviewProps) {
  return (
    <div className="mx-4 grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-neutral-600" />
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
            Week
          </span>
        </div>
        <div className="font-mono text-3xl font-bold tracking-tight text-neutral-900">
          {currentWeek}
          <span className="text-neutral-400">/{totalWeeks}</span>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-neutral-200">
          <div
            className="h-2 rounded-full bg-neutral-900 transition-all duration-500"
            style={{
              width: `${(currentWeek / totalWeeks) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-neutral-600" />
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
            Phase
          </span>
        </div>
        <div className="text-xl font-semibold tracking-tight text-neutral-900">
          {currentPhase?.phase || "Base"}
        </div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          {currentPhase?.weeks || "1-4"}
        </div>
      </div>
    </div>
  );
}
