/**
 * Strava Activity Sync
 *
 * Syncs activities from Strava and transforms them to our internal format.
 */

import { StravaClient } from "./client";
import type { StravaActivity, StravaTokens, Activity, FitnessProfile } from "./types";

// =============================================================================
// Constants
// =============================================================================

const METERS_TO_MILES = 0.000621371;
const METERS_TO_FEET = 3.28084;
const DEFAULT_SYNC_WEEKS = 12;

// Running activity types we care about
const RUNNING_TYPES = ["Run", "Trail Run", "Virtual Run", "Treadmill"];

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Transform a Strava activity to our internal format
 */
export function transformActivity(stravaActivity: StravaActivity, userId: string): Activity {
  const distanceMiles = stravaActivity.distance * METERS_TO_MILES;
  const durationMinutes = stravaActivity.moving_time / 60;
  const elevationFeet = stravaActivity.total_elevation_gain * METERS_TO_FEET;

  // Calculate pace (min/mile)
  const avgPace = distanceMiles > 0 ? durationMinutes / distanceMiles : 0;

  return {
    id: `strava-${stravaActivity.id}`,
    stravaId: stravaActivity.id,
    userId,
    name: stravaActivity.name,
    type: stravaActivity.type,
    date: new Date(stravaActivity.start_date).getTime(),
    distance: Math.round(distanceMiles * 100) / 100,
    duration: Math.round(durationMinutes * 10) / 10,
    elevation: Math.round(elevationFeet),
    avgPace: Math.round(avgPace * 100) / 100,
    avgHeartRate: stravaActivity.average_heartrate,
    maxHeartRate: stravaActivity.max_heartrate,
    tss: calculateTSS(stravaActivity),
  };
}

/**
 * Calculate Training Stress Score (simplified)
 *
 * Real TSS requires power data. This is a heart-rate based approximation
 * using the Strava suffer score as a proxy, or duration-based if no HR.
 */
function calculateTSS(activity: StravaActivity): number {
  // If Strava provides a suffer score, use that as a proxy
  if (activity.suffer_score) {
    return activity.suffer_score;
  }

  // Otherwise, estimate based on duration and intensity
  const durationHours = activity.moving_time / 3600;

  // Estimate intensity factor based on heart rate if available
  let intensityFactor = 0.7; // Default to easy run
  if (activity.average_heartrate) {
    // Assuming threshold HR around 165, scale intensity
    intensityFactor = Math.min(1.2, activity.average_heartrate / 165);
  }

  // TSS = (duration in hours) * (intensity factor)^2 * 100
  const tss = durationHours * Math.pow(intensityFactor, 2) * 100;

  return Math.round(tss);
}

/**
 * Filter activities to only running activities
 */
export function filterRunningActivities(activities: StravaActivity[]): StravaActivity[] {
  return activities.filter((a) =>
    RUNNING_TYPES.some((type) => a.type.toLowerCase().includes(type.toLowerCase()))
  );
}

// =============================================================================
// Sync Functions
// =============================================================================

export interface SyncResult {
  activities: Activity[];
  fitnessProfile: FitnessProfile;
  syncedCount: number;
  totalStravaActivities: number;
}

/**
 * Sync activities from Strava for a user
 */
export async function syncActivities(
  tokens: StravaTokens,
  userId: string,
  options?: {
    weeks?: number;
    onTokenRefresh?: (tokens: StravaTokens) => Promise<void>;
  }
): Promise<SyncResult> {
  const weeks = options?.weeks ?? DEFAULT_SYNC_WEEKS;
  const client = new StravaClient(tokens, options?.onTokenRefresh);

  // Calculate the date range
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - weeks * 7);

  // Fetch all activities
  const stravaActivities = await client.getAllActivitiesSince(afterDate);

  // Filter to running activities only
  const runningActivities = filterRunningActivities(stravaActivities);

  // Transform to our format
  const activities = runningActivities.map((a) => transformActivity(a, userId));

  // Calculate fitness profile
  const fitnessProfile = calculateFitnessProfile(activities, userId);

  return {
    activities,
    fitnessProfile,
    syncedCount: activities.length,
    totalStravaActivities: stravaActivities.length,
  };
}

/**
 * Fetch and transform a single activity by ID.
 * Used by webhook handler to process individual activity events.
 */
export async function syncSingleActivity(
  tokens: StravaTokens,
  userId: string,
  activityId: number,
  options?: {
    onTokenRefresh?: (tokens: StravaTokens) => Promise<void>;
  }
): Promise<Activity> {
  const client = new StravaClient(tokens, options?.onTokenRefresh);
  const stravaActivity = await client.getActivity(activityId);
  return transformActivity(stravaActivity, userId);
}

// =============================================================================
// Fitness Calculations
// =============================================================================

/**
 * Calculate fitness profile from activities
 */
export function calculateFitnessProfile(activities: Activity[], userId: string): FitnessProfile {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Sort by date descending
  const sorted = [...activities].sort((a, b) => b.date - a.date);

  // Calculate daily TSS for CTL/ATL
  const dailyTSS: Map<string, number> = new Map();
  for (const activity of sorted) {
    const dateKey = new Date(activity.date).toISOString().split("T")[0];
    dailyTSS.set(dateKey, (dailyTSS.get(dateKey) || 0) + (activity.tss || 0));
  }

  // Calculate CTL (42-day exponentially weighted average)
  const ctl = calculateExponentialAverage(dailyTSS, 42, now);

  // Calculate ATL (7-day exponentially weighted average)
  const atl = calculateExponentialAverage(dailyTSS, 7, now);

  // TSB = CTL - ATL
  const tsb = ctl - atl;

  // Calculate weekly stats (last 7 days)
  const weekAgo = now - 7 * oneDay;
  const weekActivities = sorted.filter((a) => a.date >= weekAgo);
  const weeklyVolume = weekActivities.reduce((sum, a) => sum + a.duration, 0);
  const weeklyMileage = weekActivities.reduce((sum, a) => sum + a.distance, 0);

  // Find longest run in last 12 weeks
  const twelveWeeksAgo = now - 84 * oneDay;
  const recentActivities = sorted.filter((a) => a.date >= twelveWeeksAgo);
  const longestRun = recentActivities.reduce((max, a) => Math.max(max, a.distance), 0);

  // Calculate average pace (weighted by distance)
  const totalDistance = recentActivities.reduce((sum, a) => sum + a.distance, 0);
  const avgPace =
    totalDistance > 0
      ? recentActivities.reduce((sum, a) => sum + a.avgPace * a.distance, 0) / totalDistance
      : 0;

  // Estimate threshold HR from activities with higher intensity
  const estimatedThresholdHR = estimateThresholdHR(recentActivities);

  // Estimate threshold pace from activities
  const estimatedThresholdPace = estimateThresholdPace(recentActivities);

  return {
    userId,
    updatedAt: now,
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
    weeklyVolume: Math.round(weeklyVolume),
    weeklyMileage: Math.round(weeklyMileage * 10) / 10,
    longestRun: Math.round(longestRun * 10) / 10,
    avgPace: Math.round(avgPace * 100) / 100,
    estimatedThresholdHR,
    estimatedThresholdPace,
  };
}

/**
 * Calculate exponentially weighted average of daily TSS
 */
function calculateExponentialAverage(
  dailyTSS: Map<string, number>,
  days: number,
  endDate: number
): number {
  const lambda = 2 / (days + 1);
  let ema = 0;
  let weight = 1;
  let totalWeight = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(endDate - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split("T")[0];
    const tss = dailyTSS.get(dateKey) || 0;

    ema += tss * weight;
    totalWeight += weight;
    weight *= 1 - lambda;
  }

  return totalWeight > 0 ? ema / totalWeight : 0;
}

/**
 * Estimate threshold heart rate from recent activities
 */
function estimateThresholdHR(activities: Activity[]): number | undefined {
  const activitiesWithHR = activities.filter((a) => a.avgHeartRate && a.maxHeartRate);

  if (activitiesWithHR.length < 3) return undefined;

  // Find activities that look like tempo/threshold efforts
  // (higher average HR, typically 30-60 min duration)
  const tempoEfforts = activitiesWithHR.filter(
    (a) => a.duration >= 20 && a.duration <= 90 && a.avgHeartRate && a.avgHeartRate > 145
  );

  if (tempoEfforts.length === 0) {
    // Fall back to 85% of max HR from all activities
    const maxHRs = activitiesWithHR.map((a) => a.maxHeartRate!);
    const avgMaxHR = maxHRs.reduce((a, b) => a + b, 0) / maxHRs.length;
    return Math.round(avgMaxHR * 0.85);
  }

  // Use average of top 20% of efforts by HR
  const sortedByHR = tempoEfforts.sort((a, b) => (b.avgHeartRate || 0) - (a.avgHeartRate || 0));
  const top20Percent = sortedByHR.slice(0, Math.max(1, Math.ceil(sortedByHR.length * 0.2)));
  const avgThresholdHR =
    top20Percent.reduce((sum, a) => sum + (a.avgHeartRate || 0), 0) / top20Percent.length;

  return Math.round(avgThresholdHR);
}

/**
 * Estimate threshold pace from recent activities
 */
function estimateThresholdPace(activities: Activity[]): number | undefined {
  if (activities.length < 3) return undefined;

  // Filter to activities with reasonable data
  const validActivities = activities.filter(
    (a) => a.distance >= 2 && a.avgPace > 0 && a.avgPace < 20 // Between 2mi and 20 min/mile
  );

  if (validActivities.length === 0) return undefined;

  // Sort by pace (fastest first)
  const sortedByPace = [...validActivities].sort((a, b) => a.avgPace - b.avgPace);

  // Threshold pace is typically around the 20th percentile (faster efforts)
  const thresholdIndex = Math.floor(sortedByPace.length * 0.2);
  const thresholdEfforts = sortedByPace.slice(0, Math.max(3, thresholdIndex));

  const avgThresholdPace =
    thresholdEfforts.reduce((sum, a) => sum + a.avgPace, 0) / thresholdEfforts.length;

  return Math.round(avgThresholdPace * 100) / 100;
}
