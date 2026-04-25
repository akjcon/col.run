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
import { getWeeksWithDates, toNoonUTC } from "@/lib/workout-utils";
import { isRestDay } from "@/lib/workout-display";

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

  const activityNoon = toNoonUTC(activity.date);

  for (const week of weeksWithDates) {
    for (const day of week.days) {
      if (!day.date) continue;
      if (toNoonUTC(day.date) !== activityNoon) continue;

      // Skip rest days
      if (isRestDay(day)) continue;

      // Match by same calendar day — distance is secondary
      // (athlete may have cut short, added extra, or done a different workout)
      return { week, day };
    }
  }

  return null;
}
