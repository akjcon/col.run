#!/usr/bin/env npx tsx
/**
 * Generate a personalized training plan from Strava data
 *
 * Usage: npx tsx scripts/generate-personal-plan.ts <userId> <raceDistance> <weeks>
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { PlanGenerationPipeline } from "../lib/agents/pipeline";
import { analyzeFeasibility, type FeasibilityInput } from "../lib/planning/feasibility";
import { getRaceRequirements, adjustForElevation } from "../lib/planning/race-requirements";
import type { AthleteProfile, RaceGoal, PlanGenerationInput } from "../lib/agents/types";
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
  const userId = process.argv[2];
  const raceDistance = process.argv[3] || "50k";
  const weeks = parseInt(process.argv[4] || "12", 10);

  if (!userId) {
    console.log("Usage: npx tsx scripts/generate-personal-plan.ts <userId> [raceDistance] [weeks]");
    console.log("\nExample: npx tsx scripts/generate-personal-plan.ts user_xxx 50k 12");
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`  Generating ${weeks}-week ${raceDistance} plan for ${userId}`);
  console.log(`============================================================\n`);

  // Get fitness profile
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  const fitnessSnap = await fitnessRef.get();

  if (!fitnessSnap.exists) {
    console.error("No fitness profile found. Run Strava sync first.");
    process.exit(1);
  }

  const fitness = fitnessSnap.data()!;
  console.log("Fitness Profile from Strava:");
  console.log(`  Weekly Mileage: ${fitness.weeklyMileage} miles`);
  console.log(`  Longest Run: ${fitness.longestRun} miles`);
  console.log(`  CTL: ${fitness.ctl}`);
  console.log(`  Threshold Pace: ${fitness.estimatedThresholdPace?.toFixed(2)} min/mi`);

  // Determine experience level based on longest run
  let experience: "beginner" | "intermediate" | "advanced" | "elite" = "intermediate";
  if (fitness.longestRun >= 26) {
    experience = "advanced"; // Has done marathon+ distance
  } else if (fitness.longestRun >= 13) {
    experience = "intermediate";
  } else {
    experience = "beginner";
  }
  console.log(`  Experience Level: ${experience} (based on longest run)\n`);

  // Build athlete profile
  const athlete: AthleteProfile = {
    experience,
    weeklyMileage: Math.round(fitness.weeklyMileage),
    longestRun: Math.round(fitness.longestRun),
    ctl: Math.round(fitness.ctl),
    thresholdPace: fitness.estimatedThresholdPace,
    // Add lifetime data since they've done 26+ miles
    lifetimeMiles: 1000, // Estimate - they've clearly been running
    longestRunEver: Math.round(fitness.longestRun),
    peakWeeklyMileage: Math.max(30, Math.round(fitness.weeklyMileage * 2)), // Estimate peak was higher
    ultraExperience: fitness.longestRun >= 31,
    trailExperience: true, // Assume trail runner given 50k goal
  };

  // Build race goal
  const raceDate = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
  const goal: RaceGoal = {
    raceDistance,
    raceDate,
    raceName: `${raceDistance} Trail Race`,
    terrainType: "trail",
    elevation: 3000, // Moderate elevation
  };

  // Get race requirements
  let raceRequirements = getRaceRequirements(raceDistance);
  if (raceRequirements && goal.elevation) {
    raceRequirements = adjustForElevation(raceRequirements, goal.elevation);
  }

  // Build fitness and experience profiles for feasibility
  const currentFitness: FitnessProfile = {
    userId,
    weeklyMileage: Math.round(fitness.weeklyMileage),
    weeklyVolume: Math.round(fitness.weeklyMileage * 9), // minutes
    longestRun: Math.round(fitness.longestRun),
    ctl: Math.round(fitness.ctl),
    atl: Math.round(fitness.atl || fitness.ctl),
    tsb: Math.round(fitness.tsb || 0),
    avgPace: fitness.avgPace || 10,
    updatedAt: Date.now(),
  };

  const experienceProfile: ExperienceProfile = {
    experienceLevel: experience,
    longestRunEver: Math.round(fitness.longestRun),
    peakWeeklyMileage: Math.max(30, Math.round(fitness.weeklyMileage * 2)),
    hasCompletedDistance: fitness.longestRun >= 31,
    monthsRunning: 24, // Estimate
  };

  // Run feasibility analysis
  console.log("Running feasibility analysis...");
  const feasibilityInput: FeasibilityInput = {
    raceType: raceDistance,
    weeksUntilRace: weeks,
    elevationGain: goal.elevation,
    currentFitness,
    experience: experienceProfile,
  };
  const feasibility = analyzeFeasibility(feasibilityInput);
  console.log(`  Feasible: ${feasibility.feasible}`);
  console.log(`  Risk Level: ${feasibility.riskLevel}`);
  console.log(`  Start: ${feasibility.recommendations.startingWeeklyMileage}mi/week`);
  console.log(`  Peak: ${feasibility.recommendations.targetPeakMileage}mi/week`);
  console.log(`  Peak Long Run: ${feasibility.recommendations.targetPeakLongRun}mi`);
  if (feasibility.warnings.length > 0) {
    console.log(`  Warnings: ${feasibility.warnings.join("; ")}`);
  }

  // Build pipeline input
  const input: PlanGenerationInput = {
    athlete,
    goal,
    raceRequirements,
    feasibility: {
      isFeasible: feasibility.feasible,
      riskLevel: feasibility.riskLevel,
      startingWeeklyMileage: feasibility.recommendations.startingWeeklyMileage,
      targetPeakMileage: feasibility.recommendations.targetPeakMileage,
      targetPeakLongRun: feasibility.recommendations.targetPeakLongRun,
      suggestedApproach: feasibility.recommendations.suggestedApproach,
      warnings: feasibility.warnings,
    },
    constraints: {
      preferredLongRunDay: "Saturday",
    },
  };

  // Generate plan
  console.log("\nGenerating training plan...");
  const startTime = Date.now();
  const pipeline = new PlanGenerationPipeline();
  const result = await pipeline.generate(input);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Plan generated in ${elapsed}s`);

  // Evaluate
  console.log(`\nEvaluating plan...`);
  console.log(`  Overall Score: ${result.evaluation.overall}%`);

  // Store in Firestore
  console.log("\nStoring plan in Firestore...");
  const planDoc = {
    createdAt: FieldValue.serverTimestamp(),
    athleteName: `Personal Plan - ${raceDistance}`,
    athleteProfile: athlete,
    raceGoal: goal,
    feasibility: input.feasibility,
    plan: result.plan,
    evaluation: result.evaluation,
    generationTimeMs: parseFloat(elapsed) * 1000,
    userId, // Track which user this is for
  };

  const docRef = await db.collection("generatedPlans").add(planDoc);
  console.log(`\nStored with ID: ${docRef.id}`);
  console.log(`View at: http://localhost:3000/review/${docRef.id}`);
}

main().catch(console.error);
