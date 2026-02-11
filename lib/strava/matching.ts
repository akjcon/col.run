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
import { calculateDayTotalMiles } from "@/lib/blocks/calculations";
import { isRestDay } from "@/lib/workout-display";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const DISTANCE_TOLERANCE = 0.3; // ±30%

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

      // Check date match (±12 hours)
      const timeDiff = Math.abs(activity.date - day.date);
      if (timeDiff > TWELVE_HOURS_MS) continue;

      // Skip rest days
      if (isRestDay(day)) continue;

      // Check distance match
      const plannedMiles = calculateDayTotalMiles(day);
      if (plannedMiles <= 0) continue;

      const distanceDiff = Math.abs(activity.distance - plannedMiles);
      const tolerance = plannedMiles * DISTANCE_TOLERANCE;

      if (distanceDiff <= tolerance) {
        return { week, day };
      }

      // If distance doesn't match but date does, still match
      // (athlete may have cut short or added extra)
      // Only match by date if it's within a tighter window (same calendar day)
      const activityDate = new Date(activity.date);
      const dayDate = new Date(day.date);
      if (
        activityDate.getFullYear() === dayDate.getFullYear() &&
        activityDate.getMonth() === dayDate.getMonth() &&
        activityDate.getDate() === dayDate.getDate()
      ) {
        return { week, day };
      }
    }
  }

  return null;
}
