/**
 * V2 Date Utilities for Training Plans
 *
 * Assigns dates to Day objects based on plan start date + week number + dayOfWeek.
 */

import type { Week, Day } from "@/lib/blocks/types";
import { getNow } from "@/lib/time";

const DAY_MAP: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

/**
 * Assign date fields to each Day in the plan based on startDate.
 * Returns a new array of weeks with dates populated on each day.
 */
export function getWeeksWithDates(
  startDate: number | undefined,
  generatedAt: number | undefined,
  weeks: Week[] | undefined
): Week[] {
  if (!weeks || weeks.length === 0) return [];

  const baseDate = startDate || generatedAt;
  if (!baseDate) return weeks;

  // Find the Monday of the week containing the base date
  const baseDateObj = new Date(baseDate);
  const dayOfWeek = baseDateObj.getDay(); // 0=Sun, 1=Mon...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const firstWeekMonday = new Date(baseDateObj);
  firstWeekMonday.setDate(baseDateObj.getDate() - daysFromMonday);
  firstWeekMonday.setHours(0, 0, 0, 0);

  return weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => {
      const dayOffset = DAY_MAP[day.dayOfWeek] ?? 0;
      const weekOffset = (week.weekNumber - 1) * 7;
      const dayDate = new Date(firstWeekMonday);
      dayDate.setDate(firstWeekMonday.getDate() + weekOffset + dayOffset);
      return {
        ...day,
        date: dayDate.getTime(),
      };
    }),
  }));
}

/**
 * Find the Day matching today's date from weeks with dates assigned.
 */
export function getTodaysDay(weeksWithDates: Week[]): Day | undefined {
  const today = getNow();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (!day.date) continue;
      const dayDate = new Date(day.date);
      const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      if (dayLocal.getTime() === todayLocal.getTime()) {
        return day;
      }
    }
  }
  return undefined;
}

/**
 * Find the Day matching tomorrow's date from weeks with dates assigned.
 */
export function getTomorrowsDay(weeksWithDates: Week[]): Day | undefined {
  const today = getNow();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (!day.date) continue;
      const dayDate = new Date(day.date);
      const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      if (dayLocal.getTime() === tomorrow.getTime()) {
        return day;
      }
    }
  }
  return undefined;
}
