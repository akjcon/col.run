"use client";

import type { Week, Block, Day } from "@/lib/blocks";

interface WeekDetailPanelProps {
  week: Week;
}

// Effort level colors
const ZONE_COLORS: Record<string, string> = {
  z1: "bg-green-100 text-green-800",
  z2: "bg-blue-100 text-blue-800",
  z3: "bg-yellow-100 text-yellow-800",
  z4: "bg-orange-100 text-orange-800",
  z5: "bg-red-100 text-red-800",
};

// Block type display names
const BLOCK_NAMES: Record<string, string> = {
  warmUp: "Warm Up",
  coolDown: "Cool Down",
  easy: "Easy",
  tempo: "Tempo",
  intervals: "Intervals",
  recovery: "Recovery",
  longRun: "Long Run",
  rest: "Rest",
};

function formatBlockValue(block: Block): string {
  if (block.type === "rest") return "";

  // Format the unit
  let unitStr: string;
  if (block.unit === "miles") {
    unitStr = "mi";
  } else if (block.unit === "seconds") {
    unitStr = "sec";
  } else {
    unitStr = "min";
  }

  // Format with repeat if present
  if (block.repeat) {
    const restStr = block.repeat.restBetween
      ? ` / ${block.repeat.restBetween.value}${block.repeat.restBetween.unit === "seconds" ? "sec" : "min"} rest`
      : "";
    return `${block.repeat.times}x${block.value}${unitStr}${restStr}`;
  }

  return `${block.value}${unitStr}`;
}

function calculateDayMiles(day: Day): number {
  let total = 0;
  for (const workout of day.workouts) {
    for (const block of workout.blocks) {
      if (block.type === "rest") continue;
      if (block.unit === "miles") {
        total += block.value;
      } else {
        total += block.value / 10;
      }
    }
  }
  return total;
}

function isRestDay(day: Day): boolean {
  for (const workout of day.workouts) {
    for (const block of workout.blocks) {
      if (block.type !== "rest" && block.value > 0) {
        return false;
      }
    }
  }
  return true;
}

function BlockPill({ block }: { block: Block }) {
  if (block.type === "rest") {
    return (
      <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-500 rounded">
        Rest
      </span>
    );
  }

  const zoneColor = ZONE_COLORS[block.effortLevel] || "bg-neutral-100 text-neutral-700";

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs px-2 py-1 rounded ${zoneColor}`}>
        {BLOCK_NAMES[block.type] || block.type} {formatBlockValue(block)}
      </span>
      {block.notes && (
        <span className="text-[10px] text-neutral-500 px-2 italic">
          {block.notes}
        </span>
      )}
    </div>
  );
}

function DayCard({ day }: { day: Day }) {
  const dayMiles = calculateDayMiles(day);
  const rest = isRestDay(day);

  // Get all non-rest blocks
  const blocks: Block[] = [];
  for (const workout of day.workouts) {
    for (const block of workout.blocks) {
      blocks.push(block);
    }
  }

  return (
    <div className={`p-3 rounded-lg border min-w-[100px] ${rest ? "bg-neutral-50 border-neutral-100" : "bg-white border-neutral-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-neutral-900">
          {day.dayOfWeek.slice(0, 3)}
        </span>
        {!rest && (
          <span className="text-xs text-neutral-500">
            {dayMiles.toFixed(1)}mi
          </span>
        )}
      </div>

      {rest ? (
        <div className="text-sm text-neutral-400 italic">Rest Day</div>
      ) : (
        <div className="flex flex-col gap-1">
          {blocks.map((block, idx) => (
            <BlockPill key={idx} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WeekDetailPanel({ week }: WeekDetailPanelProps) {
  return (
    <div className="border border-neutral-200 rounded-xl bg-white p-4 mt-2">
      <h3 className="text-sm font-semibold text-neutral-700 mb-3">
        Week {week.weekNumber} - Day by Day
      </h3>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-3" style={{ minWidth: "750px" }}>
          {week.days.map((day, idx) => (
            <DayCard key={idx} day={day} />
          ))}
        </div>
      </div>

      {/* Zone legend */}
      <div className="mt-4 pt-3 border-t border-neutral-100">
        <p className="text-xs text-neutral-500 mb-2">Effort Zones:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ZONE_COLORS).map(([zone, color]) => (
            <span key={zone} className={`text-xs px-2 py-0.5 rounded ${color}`}>
              {zone.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
