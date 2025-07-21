import { Flag } from "lucide-react";
import { formatRaceCountdown } from "@/lib/plan-utils";

interface RaceCountdownProps {
  raceDate: number; // epoch timestamp
}

export function RaceCountdown({ raceDate }: RaceCountdownProps) {
  return (
    <div className="mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <Flag className="h-5 w-5" />
        <span className="text-xs font-medium uppercase tracking-wider">
          Race Day
        </span>
      </div>
      <div className="mb-2 font-mono text-4xl font-bold tracking-tight">
        {formatRaceCountdown(raceDate)}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-300">
        {new Date(raceDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>
  );
}
