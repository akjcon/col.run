#!/usr/bin/env npx tsx
/**
 * Trigger Strava Sync directly
 *
 * Usage: npx tsx scripts/trigger-strava-sync.ts <userId>
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { syncActivities } from "../lib/strava/sync";
import type { StravaTokens } from "../lib/strava/types";

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.log("Usage: npx tsx scripts/trigger-strava-sync.ts <userId>");
    console.log("\nExample: npx tsx scripts/trigger-strava-sync.ts user_2zbjUKRVRuJbPggLxvbHbHcDQWz");
    process.exit(1);
  }

  console.log(`\nSyncing Strava activities for user: ${userId}\n`);

  // Get Strava tokens
  const stravaRef = db.collection("users").doc(userId).collection("integrations").doc("strava");
  const stravaSnap = await stravaRef.get();

  if (!stravaSnap.exists) {
    console.error("Strava not connected for this user");
    process.exit(1);
  }

  const stravaData = stravaSnap.data()!;
  const tokens: StravaTokens = {
    access_token: stravaData.accessToken,
    refresh_token: stravaData.refreshToken,
    expires_at: stravaData.expiresAt,
    token_type: "Bearer",
  };

  // Token refresh callback
  const onTokenRefresh = async (newTokens: StravaTokens) => {
    console.log("Tokens refreshed, updating Firestore...");
    await stravaRef.update({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    });
  };

  // Sync activities
  console.log("Fetching activities from Strava...");
  const result = await syncActivities(tokens, userId, {
    weeks: 12,
    onTokenRefresh,
  });

  console.log(`\nFetched ${result.totalStravaActivities} total activities from Strava`);
  console.log(`Filtered to ${result.syncedCount} running activities\n`);

  // Store activities (filter out undefined values for Firestore)
  console.log("Storing activities in Firestore...");
  const activitiesRef = db.collection("users").doc(userId).collection("activities");
  const batch = db.batch();

  for (const activity of result.activities) {
    const activityRef = activitiesRef.doc(activity.id);
    // Remove undefined values
    const cleanActivity = Object.fromEntries(
      Object.entries(activity).filter(([, v]) => v !== undefined)
    );
    batch.set(activityRef, {
      ...cleanActivity,
      syncedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // Store fitness profile
  console.log("Storing fitness profile...");
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  await fitnessRef.set({
    ...result.fitnessProfile,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update last sync time
  await stravaRef.update({
    lastSyncAt: FieldValue.serverTimestamp(),
  });

  console.log("\n✅ Sync complete!\n");
  console.log("Fitness Profile:");
  console.log(`  CTL (Fitness): ${result.fitnessProfile.ctl}`);
  console.log(`  ATL (Fatigue): ${result.fitnessProfile.atl}`);
  console.log(`  TSB (Form): ${result.fitnessProfile.tsb}`);
  console.log(`  Weekly Mileage: ${result.fitnessProfile.weeklyMileage} miles`);
  console.log(`  Longest Run: ${result.fitnessProfile.longestRun} miles`);
  console.log(`  Avg Pace: ${result.fitnessProfile.avgPace} min/mile`);
  if (result.fitnessProfile.estimatedThresholdHR) {
    console.log(`  Est. Threshold HR: ${result.fitnessProfile.estimatedThresholdHR} bpm`);
  }
  if (result.fitnessProfile.estimatedThresholdPace) {
    console.log(`  Est. Threshold Pace: ${result.fitnessProfile.estimatedThresholdPace} min/mile`);
  }
}

main().catch(console.error);
