#!/usr/bin/env npx tsx
/**
 * Analyze Goal Feasibility
 *
 * Usage: npx tsx scripts/analyze-feasibility.ts <userId> --race <type> --weeks <N> [--elevation <ft>]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { analyzeFeasibility } from "../lib/planning/feasibility";
import type { FitnessProfile, ExperienceProfile } from "../lib/strava/types";

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
  const args = process.argv.slice(2);
  const userId = args[0] || "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";

  // Parse options
  const raceIdx = args.indexOf("--race");
  const weeksIdx = args.indexOf("--weeks");
  const elevIdx = args.indexOf("--elevation");

  const raceType = raceIdx !== -1 ? args[raceIdx + 1] : "50k";
  const weeks = weeksIdx !== -1 ? parseInt(args[weeksIdx + 1]) : 10;
  const elevation = elevIdx !== -1 ? parseInt(args[elevIdx + 1]) : 6000;

  console.log("\n🎯 Analyzing Goal Feasibility\n");
  console.log(`  Race: ${raceType}`);
  console.log(`  Weeks: ${weeks}`);
  console.log(`  Elevation: ${elevation.toLocaleString()} ft`);
  console.log();

  // Load fitness profile
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  const fitnessSnap = await fitnessRef.get();
  if (!fitnessSnap.exists) {
    console.error("No fitness profile found. Run sync first.");
    process.exit(1);
  }
  const fitness = fitnessSnap.data() as FitnessProfile;

  // Load experience profile
  const experienceRef = db.collection("users").doc(userId).collection("fitness").doc("experience");
  const experienceSnap = await experienceRef.get();
  if (!experienceSnap.exists) {
    console.error("No experience profile found. Run fetch-experience-profile first.");
    process.exit(1);
  }
  const experience = experienceSnap.data() as ExperienceProfile;

  // Run analysis
  const result = analyzeFeasibility({
    raceType,
    weeksUntilRace: weeks,
    elevationGain: elevation,
    currentFitness: fitness,
    experience,
  });

  // Display results
  console.log("═".repeat(70));
  console.log("  FEASIBILITY ANALYSIS");
  console.log("═".repeat(70));
  console.log();

  const statusEmoji = result.feasible ? "✅" : "❌";
  const riskEmoji = {
    low: "🟢",
    moderate: "🟡",
    high: "🟠",
    extreme: "🔴",
  }[result.riskLevel];

  console.log(`  ${statusEmoji} FEASIBLE: ${result.feasible ? "YES" : "NO"}`);
  console.log(`  ${riskEmoji} RISK LEVEL: ${result.riskLevel.toUpperCase()}`);
  console.log(`  📊 CONFIDENCE: ${result.confidence.toUpperCase()}`);
  console.log();

  console.log("  ASSESSMENT");
  console.log("  ─".repeat(35));
  console.log(`  Experience Level:      ${result.assessment.experienceLevel}`);
  console.log(`  Current Weekly Miles:  ${result.assessment.currentWeeklyMileage} mi`);
  console.log(`  Required Peak Miles:   ${result.assessment.requiredPeakMileage} mi`);
  console.log(`  Current Long Run:      ${result.assessment.currentLongRun} mi`);
  console.log(`  Required Long Run:     ${result.assessment.requiredLongRun} mi`);
  console.log(`  Weeks Available:       ${result.assessment.weeksAvailable}`);
  console.log(`  Weeks Needed:          ${result.assessment.weeksNeeded}`);
  console.log();

  if (result.blockers.length > 0) {
    console.log("  🚫 BLOCKERS");
    console.log("  ─".repeat(35));
    for (const blocker of result.blockers) {
      console.log(`  • ${blocker}`);
    }
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log("  ⚠️  WARNINGS");
    console.log("  ─".repeat(35));
    for (const warning of result.warnings) {
      console.log(`  • ${warning}`);
    }
    console.log();
  }

  console.log("  📋 RECOMMENDATIONS");
  console.log("  ─".repeat(35));
  console.log(`  Starting Weekly Mileage: ${result.recommendations.startingWeeklyMileage} mi`);
  console.log(`  Target Peak Mileage:     ${result.recommendations.targetPeakMileage} mi`);
  console.log(`  Target Peak Long Run:    ${result.recommendations.targetPeakLongRun} mi`);
  console.log();
  console.log(`  Approach: ${result.recommendations.suggestedApproach}`);
  console.log();

  console.log("  📖 RACE REQUIREMENTS (${raceType})");
  console.log("  ─".repeat(35));
  const req = result.raceRequirements;
  console.log(`  Distance:       ${req.distanceMiles} miles`);
  console.log(`  Peak Mileage:   ${req.peakWeeklyMileage.min}-${req.peakWeeklyMileage.ideal}-${req.peakWeeklyMileage.max} mi/week`);
  console.log(`  Peak Long Run:  ${req.peakLongRun.min}-${req.peakLongRun.ideal}-${req.peakLongRun.max} miles`);
  console.log(`  Key Workouts:   ${req.keyWorkouts.join(", ")}`);
  console.log();
  console.log("  Considerations:");
  for (const c of req.considerations) {
    console.log(`    • ${c}`);
  }
  console.log();
  console.log("═".repeat(70));
  console.log();
}

main().catch(console.error);
