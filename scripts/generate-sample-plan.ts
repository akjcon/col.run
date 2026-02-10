#!/usr/bin/env npx tsx
/**
 * Generate Sample Plans for Review
 *
 * Creates training plans for different athlete profiles and stores them
 * in Firestore for review in the UI.
 *
 * Usage:
 *   npx tsx scripts/generate-sample-plan.ts [athlete-name]
 *   npx tsx scripts/generate-sample-plan.ts --list
 *
 * Examples:
 *   npx tsx scripts/generate-sample-plan.ts "Beginner Half Marathon"
 *   npx tsx scripts/generate-sample-plan.ts "Advanced 50k"
 *   npx tsx scripts/generate-sample-plan.ts --all
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
import { generatePlan } from "../lib/agents/pipeline";
import { analyzeFeasibility } from "../lib/planning/feasibility";
import { getRaceRequirements, adjustForElevation } from "../lib/planning/race-requirements";
import { evaluatePlan } from "../lib/plan-evaluation";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
  RaceRequirementsSummary,
  FeasibilitySummary,
} from "../lib/agents/types";
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

// =============================================================================
// Sample Athlete Profiles
// =============================================================================

interface SampleAthlete {
  name: string;
  fitness: FitnessProfile;
  experience: ExperienceProfile;
  goal: {
    raceDistance: string;
    raceType: string; // For race requirements lookup
    weeksUntilRace: number;
    elevation?: number;
    terrainType?: "road" | "trail";
  };
}

const SAMPLE_ATHLETES: SampleAthlete[] = [
  {
    name: "Beginner Half Marathon",
    fitness: {
      userId: "sample-beginner-half",
      updatedAt: Date.now(),
      weeklyMileage: 15,
      longestRun: 6,
      ctl: 20,
      atl: 18,
      tsb: 2, // ctl - atl
      weeklyVolume: 150, // minutes
      avgPace: 10.5,
    },
    experience: {
      userId: "sample-beginner-half",
      updatedAt: Date.now(),
      lifetimeMiles: 500,
      lifetimeRuns: 100,
      lifetimeElevationFeet: 10000,
      accountAgeYears: 1,
      longestRunEver: 8,
      peakWeeklyMileage: 20,
      peakMonthlyMileage: 60,
      biggestClimbFeet: 500,
      experienceLevel: "beginner",
      ultraExperience: false,
      trailExperience: false,
      totalShoeMileage: 400,
    },
    goal: {
      raceDistance: "half",
      raceType: "half",
      weeksUntilRace: 12,
      terrainType: "road",
    },
  },
  {
    name: "Intermediate Marathon",
    fitness: {
      userId: "sample-int-marathon",
      updatedAt: Date.now(),
      weeklyMileage: 35,
      longestRun: 16,
      ctl: 45,
      atl: 40,
      tsb: 5,
      weeklyVolume: 315, // ~9 min/mile
      avgPace: 9.0,
      estimatedThresholdPace: 8.0,
    },
    experience: {
      userId: "sample-int-marathon",
      updatedAt: Date.now(),
      lifetimeMiles: 2500,
      lifetimeRuns: 400,
      lifetimeElevationFeet: 100000,
      accountAgeYears: 3,
      longestRunEver: 20,
      peakWeeklyMileage: 45,
      peakMonthlyMileage: 160,
      biggestClimbFeet: 2000,
      experienceLevel: "intermediate",
      ultraExperience: false,
      trailExperience: true,
      totalShoeMileage: 2000,
    },
    goal: {
      raceDistance: "marathon",
      raceType: "marathon",
      weeksUntilRace: 16,
      terrainType: "road",
    },
  },
  {
    name: "Advanced 50k Trail",
    fitness: {
      userId: "sample-adv-50k",
      updatedAt: Date.now(),
      weeklyMileage: 45,
      longestRun: 22,
      ctl: 55,
      atl: 50,
      tsb: 5,
      weeklyVolume: 380,
      avgPace: 8.5,
      estimatedThresholdPace: 7.5,
    },
    experience: {
      userId: "sample-adv-50k",
      updatedAt: Date.now(),
      lifetimeMiles: 5000,
      lifetimeRuns: 700,
      lifetimeElevationFeet: 500000,
      accountAgeYears: 5,
      longestRunEver: 31,
      peakWeeklyMileage: 60,
      peakMonthlyMileage: 220,
      biggestClimbFeet: 6000,
      experienceLevel: "advanced",
      ultraExperience: true,
      trailExperience: true,
      totalShoeMileage: 4000,
    },
    goal: {
      raceDistance: "50k",
      raceType: "50k",
      weeksUntilRace: 14,
      elevation: 5000,
      terrainType: "trail",
    },
  },
  {
    name: "Experienced 50-Miler",
    fitness: {
      userId: "sample-exp-50mi",
      updatedAt: Date.now(),
      weeklyMileage: 50,
      longestRun: 28,
      ctl: 65,
      atl: 58,
      tsb: 7,
      weeklyVolume: 425,
      avgPace: 8.5,
      estimatedThresholdPace: 7.8,
    },
    experience: {
      userId: "sample-exp-50mi",
      updatedAt: Date.now(),
      lifetimeMiles: 8000,
      lifetimeRuns: 1000,
      lifetimeElevationFeet: 800000,
      accountAgeYears: 7,
      longestRunEver: 50,
      peakWeeklyMileage: 75,
      peakMonthlyMileage: 280,
      biggestClimbFeet: 10000,
      experienceLevel: "advanced",
      ultraExperience: true,
      trailExperience: true,
      totalShoeMileage: 6000,
    },
    goal: {
      raceDistance: "50mi",
      raceType: "50mi",
      weeksUntilRace: 18,
      elevation: 10000,
      terrainType: "trail",
    },
  },
  {
    name: "Comeback Runner - Marathon",
    fitness: {
      userId: "sample-comeback",
      updatedAt: Date.now(),
      weeklyMileage: 12,
      longestRun: 8,
      ctl: 15,
      atl: 12,
      tsb: 3,
      weeklyVolume: 110,
      avgPace: 9.2,
      estimatedThresholdPace: 8.5,
    },
    experience: {
      userId: "sample-comeback",
      updatedAt: Date.now(),
      lifetimeMiles: 4000,
      lifetimeRuns: 600,
      lifetimeElevationFeet: 200000,
      accountAgeYears: 6,
      longestRunEver: 26.2,
      peakWeeklyMileage: 55,
      peakMonthlyMileage: 200,
      biggestClimbFeet: 4000,
      experienceLevel: "advanced",
      ultraExperience: false,
      trailExperience: true,
      totalShoeMileage: 3500,
    },
    goal: {
      raceDistance: "marathon",
      raceType: "marathon",
      weeksUntilRace: 20,
      terrainType: "road",
    },
  },
];

// =============================================================================
// Main
// =============================================================================

async function generateAndStorePlan(sample: SampleAthlete): Promise<string> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Generating: ${sample.name}`);
  console.log(`${"=".repeat(60)}\n`);

  const { fitness, experience, goal } = sample;

  // Run feasibility analysis
  console.log("Running feasibility analysis...");
  const feasibilityResult = analyzeFeasibility({
    raceType: goal.raceType,
    weeksUntilRace: goal.weeksUntilRace,
    elevationGain: goal.elevation || 0,
    currentFitness: fitness,
    experience,
  });

  console.log(`  Feasible: ${feasibilityResult.feasible}`);
  console.log(`  Start: ${feasibilityResult.recommendations.startingWeeklyMileage}mi/week`);
  console.log(`  Peak: ${feasibilityResult.recommendations.targetPeakMileage}mi/week`);

  // Get race requirements
  let requirements = getRaceRequirements(goal.raceType);
  if (!requirements) {
    throw new Error(`Unknown race type: ${goal.raceType}`);
  }
  if (goal.elevation && goal.elevation > 1000) {
    requirements = adjustForElevation(requirements, goal.elevation);
  }

  // Calculate distance miles based on race type
  const distanceMap: Record<string, number> = {
    "5k": 3.1,
    "10k": 6.2,
    "half": 13.1,
    "marathon": 26.2,
    "50k": 31,
    "50mi": 50,
    "100k": 62,
    "100mi": 100,
  };
  const distanceMiles = distanceMap[goal.raceType] || 26.2;

  const raceRequirements: RaceRequirementsSummary = {
    distanceMiles,
    peakWeeklyMileage: requirements.peakWeeklyMileage,
    peakLongRun: requirements.peakLongRun,
    keyWorkouts: requirements.keyWorkouts,
    considerations: requirements.considerations,
  };

  const feasibility: FeasibilitySummary = {
    feasible: feasibilityResult.feasible,
    riskLevel: feasibilityResult.riskLevel,
    suggestedApproach: feasibilityResult.recommendations.suggestedApproach,
    startingWeeklyMileage: feasibilityResult.recommendations.startingWeeklyMileage,
    targetPeakMileage: feasibilityResult.recommendations.targetPeakMileage,
    targetPeakLongRun: feasibilityResult.recommendations.targetPeakLongRun,
    warnings: feasibilityResult.warnings,
  };

  // Build athlete profile
  const athlete: AthleteProfile = {
    experience: experience.experienceLevel as "beginner" | "intermediate" | "advanced",
    weeklyMileage: fitness.weeklyMileage,
    longestRun: fitness.longestRun,
    ctl: fitness.ctl,
    atl: fitness.atl,
    thresholdPace: fitness.estimatedThresholdPace,
    lifetimeMiles: experience.lifetimeMiles,
    longestRunEver: experience.longestRunEver,
    peakWeeklyMileage: experience.peakWeeklyMileage,
    ultraExperience: experience.ultraExperience,
    trailExperience: experience.trailExperience,
  };

  const raceGoal: RaceGoal = {
    raceDistance: goal.raceDistance,
    raceDate: Date.now() + goal.weeksUntilRace * 7 * 24 * 60 * 60 * 1000,
    elevation: goal.elevation,
    terrainType: goal.terrainType,
  };

  const input: PlanGenerationInput = {
    athlete,
    goal: raceGoal,
    constraints: { preferredLongRunDay: "Saturday" },
    raceRequirements,
    feasibility,
  };

  // Generate plan
  console.log("\nGenerating training plan...");
  const startTime = Date.now();
  const output = await generatePlan(input);
  const generationTimeMs = Date.now() - startTime;
  console.log(`Plan generated in ${(generationTimeMs / 1000).toFixed(1)}s`);

  // Evaluate plan
  console.log("\nEvaluating plan...");
  const evaluation = evaluatePlan(
    {
      id: "temp",
      userId: "temp",
      totalWeeks: output.plan.totalWeeks,
      weeks: output.plan.weeks,
    },
    goal.raceType
  );
  console.log(`  Overall Score: ${evaluation.overall}%`);

  // Store in Firestore
  // Remove undefined values to avoid Firestore errors
  const cleanData = JSON.parse(JSON.stringify({
    athleteName: sample.name,
    athleteProfile: athlete,
    raceGoal,
    feasibility,
    plan: {
      id: output.plan.id,
      userId: output.plan.userId,
      totalWeeks: output.plan.totalWeeks,
      weeks: output.plan.weeks,
    },
    evaluation,
    generationTimeMs,
    createdAt: Date.now(),
  }));

  console.log("\nStoring plan in Firestore...");
  const docRef = await db.collection("generatedPlans").add(cleanData);

  console.log(`\nStored with ID: ${docRef.id}`);
  console.log(`View at: http://localhost:3000/review/${docRef.id}`);

  return docRef.id;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log("Usage:");
    console.log('  npx tsx scripts/generate-sample-plan.ts "Athlete Name"');
    console.log("  npx tsx scripts/generate-sample-plan.ts --list");
    console.log("  npx tsx scripts/generate-sample-plan.ts --all");
    console.log("\nAvailable athletes:");
    SAMPLE_ATHLETES.forEach((a) => console.log(`  - ${a.name}`));
    return;
  }

  if (args[0] === "--list") {
    console.log("Available sample athletes:");
    SAMPLE_ATHLETES.forEach((a) => {
      console.log(`\n  ${a.name}`);
      console.log(`    Experience: ${a.experience.experienceLevel}`);
      console.log(`    Current: ${a.fitness.weeklyMileage}mi/week`);
      console.log(`    Goal: ${a.goal.raceDistance} in ${a.goal.weeksUntilRace} weeks`);
    });
    return;
  }

  if (args[0] === "--all") {
    console.log("Generating all sample plans...\n");
    for (const athlete of SAMPLE_ATHLETES) {
      try {
        await generateAndStorePlan(athlete);
      } catch (err) {
        console.error(`Error generating ${athlete.name}:`, err);
      }
    }
    console.log("\nDone! Visit http://localhost:3000/review to see all plans.");
    return;
  }

  // Find the specified athlete
  const athleteName = args.join(" ");
  const athlete = SAMPLE_ATHLETES.find(
    (a) => a.name.toLowerCase() === athleteName.toLowerCase()
  );

  if (!athlete) {
    console.error(`Unknown athlete: "${athleteName}"`);
    console.log("\nAvailable athletes:");
    SAMPLE_ATHLETES.forEach((a) => console.log(`  - ${a.name}`));
    process.exit(1);
  }

  await generateAndStorePlan(athlete);
}

main().catch(console.error);
