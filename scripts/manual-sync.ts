/**
 * Manually trigger a Strava sync + snapshot build for a user
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "../lib/firebase-admin";
import { syncActivities, buildExperienceProfile } from "../lib/strava";
import type { StravaTokens } from "../lib/strava";
import { buildAthleteSnapshot } from "../lib/athlete-snapshot";

const userId = process.argv[2] || "user_39S5oMAe7LfbLhu7XlREJBP64D9";

async function main() {
  const db = getAdminDb();

  console.log(`\nManual sync for user: ${userId}\n`);

  // Get Strava tokens
  const stravaRef = db.collection("users").doc(userId).collection("integrations").doc("strava");
  const stravaSnap = await stravaRef.get();

  if (!stravaSnap.exists) {
    console.error("Strava not connected for this user");
    process.exit(1);
  }

  const stravaData = stravaSnap.data()!;
  console.log("Strava athlete ID:", stravaData.athleteId);
  console.log("Current syncStatus:", stravaData.syncStatus);
  console.log("Token expires at:", new Date(stravaData.expiresAt * 1000).toISOString());
  console.log("Token expired?", stravaData.expiresAt * 1000 < Date.now());
  console.log();

  const tokens: StravaTokens = {
    access_token: stravaData.accessToken,
    refresh_token: stravaData.refreshToken,
    expires_at: stravaData.expiresAt,
    token_type: "Bearer",
  };

  const onTokenRefresh = async (newTokens: StravaTokens) => {
    console.log("Tokens refreshed!");
    await stravaRef.update({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    });
  };

  // Step 1: Sync activities
  console.log("--- Step 1: Syncing activities (12 weeks) ---");
  try {
    const result = await syncActivities(tokens, userId, {
      weeks: 12,
      onTokenRefresh,
    });
    console.log(`Synced ${result.syncedCount} running activities (${result.totalStravaActivities} total from Strava)`);
    console.log("Fitness profile:", {
      ctl: result.fitnessProfile.ctl,
      atl: result.fitnessProfile.atl,
      tsb: result.fitnessProfile.tsb,
      weeklyMileage: result.fitnessProfile.weeklyMileage,
    });

    // Store activities
    const activitiesRef = db.collection("users").doc(userId).collection("activities");
    const batch = db.batch();
    for (const activity of result.activities) {
      const activityRef = activitiesRef.doc(activity.id);
      const cleanActivity = Object.fromEntries(
        Object.entries(activity).filter(([, v]) => v !== undefined)
      );
      batch.set(activityRef, { ...cleanActivity, syncedAt: Date.now() });
    }
    await batch.commit();
    console.log("Activities stored in Firestore");

    // Store fitness profile
    await db.collection("users").doc(userId).collection("fitness").doc("profile").set({
      ...result.fitnessProfile,
      updatedAt: Date.now(),
    });
    console.log("Fitness profile stored");
  } catch (err) {
    console.error("SYNC FAILED:", err);
    process.exit(1);
  }

  // Step 2: Build experience profile
  console.log("\n--- Step 2: Building experience profile ---");
  if (stravaData.athleteId) {
    try {
      const exp = await buildExperienceProfile(tokens, userId, stravaData.athleteId, { onTokenRefresh });
      await db.collection("users").doc(userId).collection("fitness").doc("experience").set({
        ...exp,
        updatedAt: Date.now(),
      });
      console.log("Experience profile:", {
        lifetimeMiles: exp.lifetimeMiles,
        experienceLevel: exp.experienceLevel,
        peakWeeklyMileage: exp.peakWeeklyMileage,
        ultraExperience: exp.ultraExperience,
      });
    } catch (err) {
      console.error("Experience profile failed:", err);
    }
  }

  // Step 3: Update sync status
  await stravaRef.update({
    lastSyncAt: Date.now(),
    syncStatus: "complete",
  });
  console.log("\nSync status → complete");

  // Step 4: Build athlete snapshot
  console.log("\n--- Step 3: Building athlete snapshot ---");
  try {
    const snapshot = await buildAthleteSnapshot(userId);
    console.log("Snapshot built:", JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error("Snapshot build failed:", err);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
