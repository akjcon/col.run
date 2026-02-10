"use client";

import { useRef, useEffect, useMemo } from "react";
import type { Week } from "@/lib/blocks/types";
import type { PhaseTarget } from "@/lib/agents/types";
import { WeekRow } from "./WeekRow";

interface CalendarGridProps {
  weeks: Week[];
  phases: PhaseTarget[];
  currentWeek: number;
}

const DAY_HEADERS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_HEADERS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarGrid({
  weeks,
  phases,
  currentWeek,
}: CalendarGridProps) {
  const currentWeekRef = useRef<HTMLDivElement>(null);

  // Today as epoch midnight for comparison
  const todayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);

  // Scroll current week into view on mount
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  // Group weeks by phase
  const phaseGroups = useMemo(() => {
    if (!phases || phases.length === 0) {
      return [{ phase: null, weeks }];
    }

    return phases.map((phase) => ({
      phase,
      weeks: weeks.filter(
        (w) => w.weekNumber >= phase.startWeek && w.weekNumber <= phase.endWeek
      ),
    }));
  }, [weeks, phases]);

  return (
    <div className="space-y-2">
      {/* Sticky day-of-week header */}
      <div className="sticky top-0 z-10 bg-white pb-2 pt-1">
        <div className="grid grid-cols-[2.5rem_repeat(7,1fr)] gap-1 px-1 md:grid-cols-[3rem_repeat(7,1fr)] md:gap-1.5">
          <div /> {/* Empty cell for week number column */}
          {DAY_HEADERS_FULL.map((day, i) => (
            <div key={day + i} className="text-center">
              <span className="hidden text-xs font-medium text-neutral-500 md:inline">
                {day}
              </span>
              <span className="text-[10px] font-medium text-neutral-500 md:hidden">
                {DAY_HEADERS_SHORT[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase groups */}
      {phaseGroups.map((group, groupIdx) => (
        <div key={groupIdx}>
          {/* Phase label */}
          {group.phase && (
            <div className="mb-1 mt-3 flex items-center gap-2 px-2">
              <h3 className="text-xs font-semibold text-neutral-700">
                {group.phase.name}
              </h3>
              <span className="text-[10px] text-neutral-400">
                Weeks {group.phase.startWeek}-{group.phase.endWeek}
              </span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
          )}

          {/* Week rows */}
          {group.weeks.map((week) => {
            const isCurrent = week.weekNumber === currentWeek;
            return (
              <div
                key={week.weekNumber}
                ref={isCurrent ? currentWeekRef : undefined}
              >
                <WeekRow
                  week={week}
                  isCurrentWeek={isCurrent}
                  todayDate={todayDate}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
