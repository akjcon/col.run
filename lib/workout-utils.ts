/**
 * V2 Date Utilities for Training Plans
 *
 * Assigns dates to Day objects based on plan start date + week number + dayOfWeek.
 */

import type { Week, Day } from "@/lib/blocks/types";
import { getNow } from "@/lib/time";

/**
 * Normalize a timestamp to noon UTC of that calendar date.
 * Noon UTC is safe because no timezone is more than ±12h from UTC,
 * so the calendar date is the same everywhere. This eliminates
 * server-vs-browser midnight mismatches.
 */
export function toNoonUTC(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
}

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

  // Find the Monday of the week containing the base date (UTC)
  const baseDateObj = new Date(baseDate);
  const dayOfWeek = baseDateObj.getUTCDay(); // 0=Sun, 1=Mon...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayMs = Date.UTC(
    baseDateObj.getUTCFullYear(),
    baseDateObj.getUTCMonth(),
    baseDateObj.getUTCDate() - daysFromMonday,
    12 // noon UTC — timezone-safe canonical date
  );

  const ONE_DAY = 24 * 60 * 60 * 1000;

  return weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => {
      const dayOffset = DAY_MAP[day.dayOfWeek] ?? 0;
      const weekOffset = (week.weekNumber - 1) * 7;
      return {
        ...day,
        date: mondayMs + (weekOffset + dayOffset) * ONE_DAY,
      };
    }),
  }));
}

/**
 * Find the Day matching today's date from weeks with dates assigned.
 */
export function getTodaysDay(weeksWithDates: Week[]): Day | undefined {
  const todayNoon = toNoonUTC(getNow().getTime());

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (day.date && toNoonUTC(day.date) === todayNoon) return day;
    }
  }
  return undefined;
}

/**
 * Find the Day matching tomorrow's date from weeks with dates assigned.
 */
export function getTomorrowsDay(weeksWithDates: Week[]): Day | undefined {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const tomorrowNoon = toNoonUTC(getNow().getTime()) + ONE_DAY;

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (day.date && toNoonUTC(day.date) === tomorrowNoon) return day;
    }
  }
  return undefined;
}
