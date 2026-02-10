/**
 * Athlete Snapshot Builder
 *
 * Builds a single denormalized document so any AI feature
 * (chat, plan generation, plan modification) gets everything
 * about the athlete in one read.
 *
 * Storage: users/{userId}/athleteSnapshot (single doc, set via admin SDK)
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type { AthleteSnapshot } from "@/lib/types";

/**
 * Build and persist an AthleteSnapshot for a user.
 *
 * Reads from:
 *   - trainingBackground (latest)
 *   - fitness/profile (Strava fitness metrics)
 *   - fitness/experience (Strava lifetime stats)
 *   - workoutLogs (last 4 weeks for adherence)
 *
 * Writes merged result to: users/{userId}/athleteSnapshot
 */
export async function buildAthleteSnapshot(
  userId: string
): Promise<AthleteSnapshot> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(userId);

  // Read all sources in parallel
  const [backgroundSnap, fitnessSnap, experienceSnap, logsSnap] =
    await Promise.all([
      userRef
        .collection("backgrounds")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      userRef.collection("fitness").doc("profile").get(),
      userRef.collection("fitness").doc("experience").get(),
      userRef
        .collection("workoutLogs")
        .orderBy("completedAt", "desc")
        .limit(100)
        .get(),
    ]);

  // Start with required fields
  const snapshot: AthleteSnapshot = {
    updatedAt: Date.now(),
    experience: "beginner",
    weeklyMileage: 0,
    longestRun: 0,
  };

  // Merge TrainingBackground
  if (!backgroundSnap.empty) {
    const bg = backgroundSnap.docs[0].data();
    snapshot.experience = bg.experience ?? "beginner";
    snapshot.weeklyMileage = bg.weeklyMileage ?? 0;
    snapshot.longestRun = bg.longestRun ?? 0;
    snapshot.marathonPR = bg.marathonPR;
    snapshot.injuries = bg.injuries;

    if (bg.goals) {
      snapshot.raceDistance = bg.goals.raceDistance;
      snapshot.raceDate = bg.goals.raceDate;
      snapshot.targetTime = bg.goals.targetTime;
    }
  }

  // Merge FitnessProfile (Strava current state)
  if (fitnessSnap.exists) {
    const fitness = fitnessSnap.data()!;
    snapshot.ctl = fitness.ctl;
    snapshot.atl = fitness.atl;
    snapshot.tsb = fitness.tsb;
    snapshot.currentWeeklyMileage = fitness.weeklyMileage;
    snapshot.estimatedThresholdPace = fitness.estimatedThresholdPace;
  }

  // Merge ExperienceProfile (Strava lifetime)
  if (experienceSnap.exists) {
    const exp = experienceSnap.data()!;
    snapshot.lifetimeMiles = exp.lifetimeMiles;
    snapshot.peakWeeklyMileage = exp.peakWeeklyMileage;
    snapshot.experienceLevel = exp.experienceLevel;
    snapshot.ultraExperience = exp.ultraExperience;
    snapshot.trailExperience = exp.trailExperience;
  }

  // Calculate recent adherence from WorkoutLogs (last 4 weeks)
  if (!logsSnap.empty) {
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recentLogs = logsSnap.docs
      .map((d) => d.data())
      .filter((log) => (log.completedAt ?? 0) >= fourWeeksAgo);

    if (recentLogs.length > 0) {
      const ratings = recentLogs
        .map((l) => l.feelingRating)
        .filter((r): r is number => r != null);

      snapshot.recentAdherence = {
        completed: recentLogs.length,
        total: recentLogs.length, // total planned not easily available here
        avgFeeling:
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10
              ) / 10
            : undefined,
      };
    }
  }

  // Strip undefined values (Firestore Admin SDK rejects them)
  const cleanSnapshot = JSON.parse(JSON.stringify(snapshot));

  // Persist the snapshot
  await userRef
    .collection("athleteSnapshot")
    .doc("current")
    .set(cleanSnapshot);

  return snapshot;
}
