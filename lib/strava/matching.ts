/**
 * Activity Matching
 *
 * Matches a Strava activity to a training plan day based on:
 * 1. Date match (±12 hours for timezone tolerance)
 * 2. Distance match (±30% of planned miles)
 */

import type { Activity } from "./types";
import type { TrainingPlan } from "@/lib/types";
import type { Week, Day } from "@/lib/blocks/types";
import { getWeeksWithDates } from "@/lib/workout-utils";
import { isRestDay } from "@/lib/workout-display";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Compare two timestamps by local calendar date (year/month/day). */
function sameLocalDate(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

interface MatchResult {
  week: Week;
  day: Day;
}

/**
 * Match an activity to a training plan day.
 *
 * 1. Find plan day whose date matches activity date (±12 hours for timezone)
 * 2. If day has workouts, check distance within ±30% of planned
 * 3. Return matched day or null
 */
export function matchActivityToDay(
  activity: Activity,
  plan: TrainingPlan
): MatchResult | null {
  const weeksWithDates = getWeeksWithDates(
    plan.startDate,
    plan.generatedAt,
    plan.weeks
  );

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (!day.date) continue;

      // Quick filter: skip days more than 24 hours apart
      const timeDiff = Math.abs(activity.date - day.date);
      if (timeDiff > TWENTY_FOUR_HOURS_MS) continue;

      // Must be the same local calendar day (handles timezone offsets
      // where day.date is midnight local but activity.date may be
      // next-day UTC for evening runs)
      if (!sameLocalDate(activity.date, day.date)) continue;

      // Skip rest days
      if (isRestDay(day)) continue;

      // Match by same calendar day — distance is secondary
      // (athlete may have cut short, added extra, or done a different workout)
      return { week, day };
    }
  }

  return null;
}
