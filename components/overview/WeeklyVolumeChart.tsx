"use client";

import { useRef, useEffect } from "react";
import type { Week } from "@/lib/blocks/types";
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";

interface WeeklyVolumeChartProps {
  weeks: Week[];
  currentWeek: number;
}

export function WeeklyVolumeChart({
  weeks,
  currentWeek,
}: WeeklyVolumeChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate miles for each week
  const weekMiles = weeks.map((w) => ({
    weekNumber: w.weekNumber,
    miles: Math.round(calculateWeekTotalMiles(w) * 10) / 10,
  }));

  const maxMiles = Math.max(...weekMiles.map((w) => w.miles), 1);

  // Scroll current week into view on mount
  useEffect(() => {
    if (scrollRef.current && currentWeek > 1) {
      const barWidth = 40; // approx width per bar including gap
      const scrollTo = (currentWeek - 1) * barWidth - scrollRef.current.clientWidth / 2 + barWidth / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
    }
  }, [currentWeek]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">
        Weekly Volume
      </h3>

      <div
        ref={scrollRef}
        className="overflow-x-auto"
      >
        <div
          className="flex items-end gap-1"
          style={{ minWidth: weeks.length > 10 ? `${weeks.length * 40}px` : undefined }}
        >
          {weekMiles.map((w) => {
            const heightPercent = (w.miles / maxMiles) * 100;
            const isCurrent = w.weekNumber === currentWeek;
            const isPast = w.weekNumber < currentWeek;

            let barColor = "bg-neutral-200"; // future
            if (isCurrent) barColor = "bg-neutral-900";
            else if (isPast) barColor = "bg-neutral-400";

            return (
              <div
                key={w.weekNumber}
                className="flex flex-1 flex-col items-center"
                style={{ minWidth: "32px" }}
              >
                {/* Mile label on top */}
                <span
                  className={`mb-1 text-[9px] tabular-nums ${
                    isCurrent
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {w.miles > 0 ? Math.round(w.miles) : ""}
                </span>

                {/* Bar */}
                <div className="relative w-full" style={{ height: "120px" }}>
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t ${barColor} transition-all duration-300`}
                    style={{
                      height: `${Math.max(heightPercent, 2)}%`,
                      width: "60%",
                    }}
                  />
                </div>

                {/* Week number label */}
                <span
                  className={`mt-1 text-[10px] tabular-nums ${
                    isCurrent
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {w.weekNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-right text-[10px] text-neutral-400">
        Peak: {Math.round(maxMiles)} mi
      </p>
    </div>
  );
}
