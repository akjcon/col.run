#!/usr/bin/env npx tsx
/**
 * Fetch Experience Profile from Strava
 *
 * Usage: npx tsx scripts/fetch-experience-profile.ts <userId>
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
import { buildExperienceProfile } from "../lib/strava/experience";
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
  const userId = process.argv[2] || "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";

  console.log("\n🏃 Fetching experience profile from Strava...\n");

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

  const athleteId = stravaData.athleteId;

  // Token refresh callback
  const onTokenRefresh = async (newTokens: StravaTokens) => {
    console.log("Tokens refreshed, updating Firestore...");
    await stravaRef.update({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    });
  };

  // Build experience profile
  console.log("Analyzing 52 weeks of activity history...\n");
  const profile = await buildExperienceProfile(tokens, userId, athleteId, {
    historyWeeks: 52,
    onTokenRefresh,
  });

  // Save to Firestore
  const experienceRef = db.collection("users").doc(userId).collection("fitness").doc("experience");
  await experienceRef.set({
    ...profile,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Display results
  console.log("═".repeat(60));
  console.log("  EXPERIENCE PROFILE");
  console.log("═".repeat(60));
  console.log();
  console.log("  LIFETIME STATS");
  console.log("  ─".repeat(30));
  console.log(`  Total Miles:        ${profile.lifetimeMiles.toLocaleString()} miles`);
  console.log(`  Total Runs:         ${profile.lifetimeRuns.toLocaleString()} runs`);
  console.log(`  Total Elevation:    ${profile.lifetimeElevationFeet.toLocaleString()} ft`);
  console.log(`  Account Age:        ${profile.accountAgeYears} years`);
  console.log();
  console.log("  PEAK PERFORMANCES (Last 52 Weeks)");
  console.log("  ─".repeat(30));
  console.log(`  Longest Run Ever:   ${profile.longestRunEver} miles`);
  console.log(`  Peak Weekly Miles:  ${profile.peakWeeklyMileage} miles`);
  console.log(`  Peak Monthly Miles: ${profile.peakMonthlyMileage} miles`);
  console.log(`  Biggest Climb:      ${profile.biggestClimbFeet.toLocaleString()} ft`);
  console.log();
  console.log("  DERIVED CLASSIFICATIONS");
  console.log("  ─".repeat(30));
  console.log(`  Experience Level:   ${profile.experienceLevel.toUpperCase()}`);
  console.log(`  Ultra Experience:   ${profile.ultraExperience ? "Yes" : "No"}`);
  console.log(`  Trail Experience:   ${profile.trailExperience ? "Yes" : "No"}`);
  console.log(`  Total Shoe Mileage: ${profile.totalShoeMileage.toLocaleString()} miles`);
  console.log();
  console.log("═".repeat(60));
  console.log("  Saved to Firestore: users/{userId}/fitness/experience");
  console.log("═".repeat(60));
  console.log();
}

main().catch(console.error);
