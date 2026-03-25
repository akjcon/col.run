/**
 * Strava Webhook Pipeline
 *
 * Shared pipeline for processing a Strava activity:
 * store → match → create WorkoutLog → analyze → rebuild snapshot
 *
 * Used by both the real webhook and the mock/dev webhook.
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { matchActivityToDay } from "@/lib/strava/matching";
import { buildAthleteSnapshot } from "@/lib/athlete-snapshot";
import {
  analyzeMatchedWorkout,
  analyzeUnplannedWorkout,
} from "@/lib/workout-analysis";
import type { MatchedAnalysis, UnplannedAnalysis } from "@/lib/workout-analysis";
import type { Activity } from "@/lib/strava/types";
import type { WorkoutLog, TrainingPlan, AthleteSnapshot } from "@/lib/types";
import type { Week, Day } from "@/lib/blocks/types";
import { getDayTitle } from "@/lib/workout-display";
import {
  calculateDayTotalMiles,
  calculateDayTotal,
} from "@/lib/blocks/calculations";
import { getWeeksWithDates } from "@/lib/workout-utils";

// =============================================================================
// Types
// =============================================================================

export interface WebhookPipelineResult {
  activity: Activity;
  matched: boolean;
  workoutLog: WorkoutLog;
  analysis: MatchedAnalysis | UnplannedAnalysis | null;
}

// =============================================================================
// Pipeline
// =============================================================================

/**
 * Process a Strava activity through the full pipeline:
 * 1. Store activity in Firestore
 * 2. Match to active training plan
 * 3. Create WorkoutLog (matched or unplanned)
 * 4. Run LLM analysis (try/catch — failure doesn't break pipeline)
 * 5. Update WorkoutLog with analysis
 * 6. Rebuild athlete snapshot
 */
export async function processActivityWebhook(
  activity: Activity,
  userId: string
): Promise<WebhookPipelineResult> {
  const db = getAdminDb();

  // 1. Store the activity
  const activityRef = db
    .collection("users")
    .doc(userId)
    .collection("activities")
    .doc(activity.id);

  const cleanActivity = Object.fromEntries(
    Object.entries(activity).filter(([, v]) => v !== undefined)
  );
  await activityRef.set({ ...cleanActivity, syncedAt: Date.now() });

  // 2. Try to match to a plan day
  const planSnap = await db
    .collection("users")
    .doc(userId)
    .collection("trainingPlans")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  let plan: TrainingPlan | null = null;
  let matchedWeek: Week | null = null;
  let matchedDay: Day | null = null;

  if (!planSnap.empty) {
    const planDoc = planSnap.docs[0];
    plan = { id: planDoc.id, ...planDoc.data() } as TrainingPlan;

    const match = matchActivityToDay(activity, plan);
    if (match) {
      matchedWeek = match.week;
      matchedDay = match.day;
    }
  }

  // 3. Create WorkoutLog
  let workoutLog: WorkoutLog;
  const isMatched = matchedDay !== null && matchedWeek !== null;

  if (matchedDay && matchedWeek) {
    const logId = `${matchedDay.date}-${matchedDay.dayOfWeek}`;
    workoutLog = {
      id: logId,
      date: matchedDay.date!,
      weekNumber: matchedWeek.weekNumber,
      dayOfWeek: matchedDay.dayOfWeek,
      plannedTitle: getDayTitle(matchedDay),
      plannedMiles: calculateDayTotalMiles(matchedDay),
      plannedMinutes: calculateDayTotal(matchedDay),
      source: "strava",
      completedAt: activity.date,
      stravaActivityId: activity.stravaId,
      actualMiles: activity.distance,
      actualMinutes: activity.duration,
      actualElevation: activity.elevation,
      avgPace: activity.avgPace,
      avgHeartRate: activity.avgHeartRate,
    };
  } else {
    // Unplanned activity
    const activityDate = new Date(activity.date);
    const dayMidnight = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate()
    ).getTime();
    const logId = `${dayMidnight}-unplanned-${activity.stravaId}`;

    // Find current week if plan exists
    let currentWeekNumber = 0;
    if (plan) {
      const weeksWithDates = getWeeksWithDates(
        plan.startDate,
        plan.generatedAt,
        plan.weeks
      );
      for (const w of weeksWithDates) {
        for (const d of w.days) {
          if (!d.date) continue;
          const dDate = new Date(d.date);
          const dMidnight = new Date(
            dDate.getFullYear(),
            dDate.getMonth(),
            dDate.getDate()
          ).getTime();
          if (dMidnight === dayMidnight) {
            currentWeekNumber = w.weekNumber;
            break;
          }
        }
        if (currentWeekNumber > 0) break;
      }
    }

    workoutLog = {
      id: logId,
      date: dayMidnight,
      weekNumber: currentWeekNumber,
      dayOfWeek: "unplanned",
      plannedTitle: "Unplanned Activity",
      source: "strava",
      completedAt: activity.date,
      stravaActivityId: activity.stravaId,
      actualMiles: activity.distance,
      actualMinutes: activity.duration,
      actualElevation: activity.elevation,
      avgPace: activity.avgPace,
      avgHeartRate: activity.avgHeartRate,
    };
  }

  // Save the log (before analysis, so it's persisted even if analysis fails)
  await db
    .collection("users")
    .doc(userId)
    .collection("workoutLogs")
    .doc(workoutLog.id)
    .set(
      Object.fromEntries(
        Object.entries(workoutLog).filter(([, v]) => v !== undefined)
      )
    );

  console.log(
    isMatched
      ? `Matched activity ${activity.stravaId} to ${matchedDay!.dayOfWeek} week ${matchedWeek!.weekNumber}`
      : `Unplanned activity ${activity.stravaId}`
  );

  // 4. Run LLM analysis (wrapped in try/catch)
  let analysis: MatchedAnalysis | UnplannedAnalysis | null = null;

  // Fetch snapshot for analysis context
  let snapshot: AthleteSnapshot | null = null;
  try {
    const snapshotDoc = await db
      .collection("users")
      .doc(userId)
      .collection("athleteSnapshot")
      .doc("current")
      .get();
    if (snapshotDoc.exists) {
      snapshot = snapshotDoc.data() as AthleteSnapshot;
    }
  } catch {
    // Proceed without snapshot
  }

  try {
    if (isMatched) {
      analysis = await analyzeMatchedWorkout(
        activity,
        matchedDay!,
        matchedWeek!,
        snapshot
      );

      // 5. Update the log with analysis results
      const matchedAnalysis = analysis as MatchedAnalysis;
      workoutLog.adherence = matchedAnalysis.adherence;
      workoutLog.coachingNote = matchedAnalysis.coachingNote;
    } else {
      // Find today's planned day for context
      let todayPlannedDay: Day | null = null;
      let todayWeek: Week | null = null;
      if (plan) {
        const weeksWithDates = getWeeksWithDates(
          plan.startDate,
          plan.generatedAt,
          plan.weeks
        );
        const activityDate = new Date(activity.date);
        const activityMidnight = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate()
        ).getTime();

        for (const w of weeksWithDates) {
          for (const d of w.days) {
            if (!d.date) continue;
            const dDate = new Date(d.date);
            const dMidnight = new Date(
              dDate.getFullYear(),
              dDate.getMonth(),
              dDate.getDate()
            ).getTime();
            if (dMidnight === activityMidnight) {
              todayPlannedDay = d;
              todayWeek = w;
              break;
            }
          }
          if (todayPlannedDay) break;
        }
      }

      analysis = await analyzeUnplannedWorkout(
        activity,
        todayPlannedDay,
        todayWeek,
        snapshot
      );

      const unplannedAnalysis = analysis as UnplannedAnalysis;
      workoutLog.coachingNote = unplannedAnalysis.coachingNote;
    }

    // Update Firestore with analysis
    const updateData: Record<string, unknown> = {};
    if (workoutLog.adherence) updateData.adherence = workoutLog.adherence;
    if (workoutLog.coachingNote) updateData.coachingNote = workoutLog.coachingNote;

    if (Object.keys(updateData).length > 0) {
      await db
        .collection("users")
        .doc(userId)
        .collection("workoutLogs")
        .doc(workoutLog.id)
        .update(updateData);
    }
  } catch (err) {
    console.warn("LLM analysis failed (log saved without coaching note):", err);
  }

  // 6. Rebuild athlete snapshot
  try {
    await buildAthleteSnapshot(userId);
  } catch (err) {
    console.warn("Could not rebuild snapshot after webhook:", err);
  }

  return {
    activity,
    matched: isMatched,
    workoutLog,
    analysis,
  };
}
