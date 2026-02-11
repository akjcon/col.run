"use client";

import type { Week } from "@/lib/blocks/types";
import { DayCell } from "./DayCell";

interface WeekRowProps {
  week: Week;
  isCurrentWeek: boolean;
  todayDate: number | null; // epoch ms of today's midnight
}

export function WeekRow({ week, isCurrentWeek, todayDate }: WeekRowProps) {
  return (
    <div
      className={`grid grid-cols-[2.5rem_repeat(7,1fr)] gap-1 rounded-lg px-1 py-1 md:grid-cols-[3rem_repeat(7,1fr)] md:gap-1.5 ${
        isCurrentWeek ? "bg-neutral-50" : ""
      }`}
    >
      {/* Week number label */}
      <div className="flex items-center justify-center">
        <span
          className={`text-[10px] tabular-nums md:text-xs ${
            isCurrentWeek
              ? "font-bold text-neutral-900"
              : "text-neutral-400"
          }`}
        >
          W{week.weekNumber}
        </span>
      </div>

      {/* Day cells */}
      {week.days.map((day, i) => {
        const isToday =
          todayDate !== null && day.date !== undefined && (() => {
            const dayDate = new Date(day.date!);
            const dayMidnight = new Date(
              dayDate.getFullYear(),
              dayDate.getMonth(),
              dayDate.getDate()
            ).getTime();
            return dayMidnight === todayDate;
          })();

        return <DayCell key={i} day={day} isToday={isToday} />;
      })}
    </div>
  );
}
