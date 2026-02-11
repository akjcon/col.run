/**
 * Experience Profiler
 *
 * Analyzes Strava data to build a comprehensive picture of an athlete's
 * experience and capabilities, separate from their current training load.
 */

import { StravaClient } from "./client";
import { filterRunningActivities, transformActivity } from "./sync";
import type {
  StravaTokens,
  StravaAthleteStats,
  StravaAthlete,
  Activity,
  ExperienceProfile,
} from "./types";

const METERS_TO_MILES = 0.000621371;
const METERS_TO_FEET = 3.28084;

// =============================================================================
// Experience Profile Builder
// =============================================================================

export interface BuildExperienceOptions {
  /** Weeks of activity history to analyze (default: 52) */
  historyWeeks?: number;
  /** Callback when tokens are refreshed */
  onTokenRefresh?: (tokens: StravaTokens) => Promise<void>;
}

/**
 * Build a comprehensive experience profile from Strava data
 */
export async function buildExperienceProfile(
  tokens: StravaTokens,
  userId: string,
  athleteId: number,
  options?: BuildExperienceOptions
): Promise<ExperienceProfile> {
  const historyWeeks = options?.historyWeeks ?? 52;
  const client = new StravaClient(tokens, options?.onTokenRefresh);

  // Fetch all the data we need
  const [stats, athlete, activities] = await Promise.all([
    client.getAthleteStats(athleteId),
    client.getDetailedAthlete(),
    fetchExtendedHistory(client, historyWeeks),
  ]);

  // Transform activities to our format
  const runningActivities = filterRunningActivities(activities);
  const transformedActivities = runningActivities.map((a) =>
    transformActivity(a, userId)
  );

  // Calculate derived metrics
  const peakMetrics = calculatePeakMetrics(transformedActivities);
  const experienceLevel = deriveExperienceLevel(stats, peakMetrics);
  const ultraExperience = peakMetrics.longestRunEver > 26.2;
  const trailExperience = calculateTrailExperience(transformedActivities);
  const totalShoeMileage = calculateShoeMileage(athlete);
  const accountAgeYears = calculateAccountAge(athlete);

  return {
    userId,
    updatedAt: Date.now(),

    // Lifetime totals from stats
    lifetimeMiles: Math.round(stats.all_run_totals.distance * METERS_TO_MILES),
    lifetimeRuns: stats.all_run_totals.count,
    lifetimeElevationFeet: Math.round(
      stats.all_run_totals.elevation_gain * METERS_TO_FEET
    ),
    accountAgeYears,

    // Peak performances
    longestRunEver: peakMetrics.longestRunEver,
    peakWeeklyMileage: peakMetrics.peakWeeklyMileage,
    peakMonthlyMileage: peakMetrics.peakMonthlyMileage,
    biggestClimbFeet: Math.round(
      stats.biggest_climb_elevation_gain * METERS_TO_FEET
    ),

    // Derived classifications
    experienceLevel,
    ultraExperience,
    trailExperience,
    totalShoeMileage,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetch extended activity history
 */
async function fetchExtendedHistory(
  client: StravaClient,
  weeks: number
): Promise<ReturnType<typeof client.getAllActivitiesSince> extends Promise<infer T> ? T : never> {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - weeks * 7);
  return client.getAllActivitiesSince(afterDate);
}

interface PeakMetrics {
  longestRunEver: number;
  peakWeeklyMileage: number;
  peakMonthlyMileage: number;
}

/**
 * Calculate peak performance metrics from activity history
 */
function calculatePeakMetrics(activities: Activity[]): PeakMetrics {
  if (activities.length === 0) {
    return { longestRunEver: 0, peakWeeklyMileage: 0, peakMonthlyMileage: 0 };
  }

  // Find longest run
  const longestRunEver = Math.max(...activities.map((a) => a.distance));

  // Calculate weekly mileages
  const weeklyMileage = new Map<string, number>();
  const monthlyMileage = new Map<string, number>();

  for (const activity of activities) {
    const date = new Date(activity.date);

    // Week key (ISO week)
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split("T")[0];
    weeklyMileage.set(weekKey, (weeklyMileage.get(weekKey) || 0) + activity.distance);

    // Month key
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMileage.set(monthKey, (monthlyMileage.get(monthKey) || 0) + activity.distance);
  }

  const peakWeeklyMileage =
    weeklyMileage.size > 0
      ? Math.round(Math.max(...weeklyMileage.values()) * 10) / 10
      : 0;

  const peakMonthlyMileage =
    monthlyMileage.size > 0
      ? Math.round(Math.max(...monthlyMileage.values()) * 10) / 10
      : 0;

  return {
    longestRunEver: Math.round(longestRunEver * 10) / 10,
    peakWeeklyMileage,
    peakMonthlyMileage,
  };
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Derive experience level from stats and peak metrics
 */
function deriveExperienceLevel(
  stats: StravaAthleteStats,
  peakMetrics: PeakMetrics
): "beginner" | "intermediate" | "advanced" | "elite" {
  const lifetimeMiles = stats.all_run_totals.distance * METERS_TO_MILES;
  const lifetimeRuns = stats.all_run_totals.count;
  const { longestRunEver, peakWeeklyMileage } = peakMetrics;

  // Elite: Very high lifetime miles, ultra distances, high peak volume
  if (
    lifetimeMiles > 5000 &&
    longestRunEver > 50 &&
    peakWeeklyMileage > 70
  ) {
    return "elite";
  }

  // Advanced: Significant lifetime miles, marathon+ distances, solid peak volume
  if (
    lifetimeMiles > 2000 ||
    longestRunEver > 26.2 ||
    peakWeeklyMileage > 50
  ) {
    return "advanced";
  }

  // Intermediate: Moderate experience
  if (
    lifetimeMiles > 500 ||
    lifetimeRuns > 100 ||
    longestRunEver > 13.1 ||
    peakWeeklyMileage > 25
  ) {
    return "intermediate";
  }

  // Beginner: Limited running history
  return "beginner";
}

/**
 * Determine if athlete has significant trail/elevation experience
 */
function calculateTrailExperience(activities: Activity[]): boolean {
  // Check if they have runs with significant elevation
  // Rule: At least 3 runs with 100+ ft/mile elevation gain
  const elevatedRuns = activities.filter((a) => {
    if (a.distance === 0) return false;
    const elevationPerMile = a.elevation / a.distance;
    return elevationPerMile > 100;
  });

  return elevatedRuns.length >= 3;
}

/**
 * Calculate total mileage across all shoes
 */
function calculateShoeMileage(athlete: StravaAthlete): number {
  if (!athlete.shoes || athlete.shoes.length === 0) return 0;

  const totalMeters = athlete.shoes.reduce((sum, shoe) => sum + shoe.distance, 0);
  return Math.round(totalMeters * METERS_TO_MILES);
}

/**
 * Calculate account age in years
 */
function calculateAccountAge(athlete: StravaAthlete): number {
  if (!athlete.created_at) return 0;

  const created = new Date(athlete.created_at);
  const now = new Date();
  const years = (now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
}
