"use client";

import type { Week } from "@/lib/blocks/types";
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";
import { DayCell } from "./DayCell";

interface WeekRowProps {
  week: Week;
  isCurrentWeek: boolean;
  todayDate: number | null; // epoch ms of today's midnight
  completedDates?: Set<number>;
}

export function WeekRow({ week, isCurrentWeek, todayDate, completedDates }: WeekRowProps) {
  const weekMiles = calculateWeekTotalMiles(week);

  return (
    <div
      className={`grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5 rounded-lg py-0.5 md:grid-cols-[3rem_repeat(7,1fr)] md:gap-1.5 md:px-1 md:py-1 ${
        isCurrentWeek ? "bg-neutral-50" : ""
      }`}
    >
      {/* Week number label */}
      <div className="flex flex-col items-center justify-center">
        <span
          className={`text-[10px] tabular-nums md:text-xs ${
            isCurrentWeek
              ? "font-bold text-neutral-900"
              : "text-neutral-400"
          }`}
        >
          W{week.weekNumber}
        </span>
        {weekMiles > 0 && (
          <span className="text-[8px] tabular-nums text-neutral-400 md:text-[10px]">
            {Math.round(weekMiles * 10) / 10}mi
          </span>
        )}
      </div>

      {/* Day cells */}
      {week.days.map((day, i) => {
        let isToday = false;
        let isPast = false;
        let dayMidnight: number | null = null;

        if (todayDate !== null && day.date !== undefined) {
          const d = new Date(day.date);
          dayMidnight = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          ).getTime();
          isToday = dayMidnight === todayDate;
          isPast = dayMidnight < todayDate;
        }

        const isCompleted = dayMidnight !== null && completedDates?.has(dayMidnight);

        return (
          <DayCell
            key={i}
            day={day}
            isToday={isToday}
            isPast={isPast}
            isCompleted={!!isCompleted}
          />
        );
      })}
    </div>
  );
}
