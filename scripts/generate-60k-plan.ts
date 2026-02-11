#!/usr/bin/env npx tsx
/**
 * Generate 60k Plan from Strava Data
 *
 * Race: 60k with 9k vert in 14 weeks
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
import type { Week, Block } from "../lib/blocks";

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
// Race Parameters
// =============================================================================

const RACE_DISTANCE = "60k"; // ~37 miles
const RACE_DISTANCE_MILES = 37;
const RACE_ELEVATION = 9000; // 9k vert
const WEEKS_UNTIL_RACE = 14;

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatPace(minPerMile: number): string {
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`;
}

function formatBlock(block: Block): string {
  if (block.type === "rest") return "Rest";
  const unit = block.unit === "miles" ? "mi" : "min";
  return `${block.type}(${block.value}${unit})`;
}

function blockToMiles(block: Block, paceMinPerMile = 10): number {
  if (block.type === "rest") return 0;
  if (block.unit === "miles") return block.value;
  return block.value / paceMinPerMile;
}

function calculateWeekMiles(week: Week): number {
  return week.days.reduce(
    (sum, day) =>
      sum + day.workouts.reduce(
        (wSum, workout) =>
          wSum + workout.blocks.reduce((bSum, block) => bSum + blockToMiles(block), 0),
        0
      ),
    0
  );
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const userId = process.argv[2] || "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";

  console.log("\n" + "═".repeat(70));
  console.log("  GENERATING 60K TRAINING PLAN FROM STRAVA DATA");
  console.log("═".repeat(70));
  console.log(`\n  Race: ${RACE_DISTANCE} with ${RACE_ELEVATION.toLocaleString()}ft elevation`);
  console.log(`  Weeks: ${WEEKS_UNTIL_RACE}`);
  console.log(`  User: ${userId}\n`);

  // Load fitness profile
  console.log("📊 Loading fitness data from Firestore...");
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  const fitnessSnap = await fitnessRef.get();

  if (!fitnessSnap.exists) {
    console.error("❌ No fitness profile found. Please sync Strava first.");
    process.exit(1);
  }

  const fitnessData = fitnessSnap.data()!;

  // Load experience profile if available
  const experienceRef = db.collection("users").doc(userId).collection("fitness").doc("experience");
  const experienceSnap = await experienceRef.get();
  const experienceData = experienceSnap.exists ? experienceSnap.data()! : null;

  // Build fitness profile for feasibility analysis
  const fitness: FitnessProfile = {
    userId,
    updatedAt: Date.now(),
    weeklyMileage: fitnessData.weeklyMileage || 0,
    longestRun: fitnessData.longestRun || 0,
    ctl: fitnessData.ctl || 0,
    atl: fitnessData.atl || 0,
    estimatedThresholdPace: fitnessData.estimatedThresholdPace,
  };

  // Build experience profile (use defaults if not available)
  const experience: ExperienceProfile = {
    userId,
    updatedAt: Date.now(),
    lifetimeMiles: experienceData?.lifetimeMiles || 1000,
    lifetimeRuns: experienceData?.lifetimeRuns || 200,
    lifetimeElevationFeet: experienceData?.lifetimeElevationFeet || 100000,
    accountAgeYears: experienceData?.accountAgeYears || 2,
    longestRunEver: experienceData?.longestRunEver || fitnessData.longestRun || 15,
    peakWeeklyMileage: experienceData?.peakWeeklyMileage || fitnessData.weeklyMileage * 1.5 || 40,
    peakMonthlyMileage: experienceData?.peakMonthlyMileage || 150,
    biggestClimbFeet: experienceData?.biggestClimbFeet || 5000,
    experienceLevel: experienceData?.experienceLevel || "intermediate",
    ultraExperience: experienceData?.ultraExperience || false,
    trailExperience: experienceData?.trailExperience || true,
    totalShoeMileage: experienceData?.totalShoeMileage || 1000,
  };

  console.log("\n  Current Fitness:");
  console.log(`    Weekly Mileage: ${fitness.weeklyMileage} miles`);
  console.log(`    Longest Run (12wk): ${fitness.longestRun} miles`);
  console.log(`    CTL/ATL: ${fitness.ctl}/${fitness.atl}`);
  if (fitness.estimatedThresholdPace) {
    console.log(`    Threshold Pace: ${formatPace(fitness.estimatedThresholdPace)}`);
  }

  console.log("\n  Experience Profile:");
  console.log(`    Level: ${experience.experienceLevel}`);
  console.log(`    Lifetime Miles: ${experience.lifetimeMiles.toLocaleString()}`);
  console.log(`    Longest Run Ever: ${experience.longestRunEver} miles`);
  console.log(`    Peak Weekly: ${experience.peakWeeklyMileage} miles`);
  console.log(`    Ultra Experience: ${experience.ultraExperience ? "Yes" : "No"}`);
  console.log(`    Trail Experience: ${experience.trailExperience ? "Yes" : "No"}`);

  // Run feasibility analysis
  console.log("\n🎯 Running feasibility analysis...");

  // For 60k, we use 50mi requirements since 60k ≈ 37mi
  const feasibilityResult = analyzeFeasibility({
    raceType: "50mi", // Use 50mi as proxy for 60k
    weeksUntilRace: WEEKS_UNTIL_RACE,
    elevationGain: RACE_ELEVATION,
    currentFitness: fitness,
    experience,
  });

  console.log(`\n  Feasibility: ${feasibilityResult.feasible ? "✅ Feasible" : "⚠️ Challenging"}`);
  console.log(`  Risk Level: ${feasibilityResult.riskLevel}`);
  console.log(`  Recommended Start: ${feasibilityResult.recommendations.startingWeeklyMileage} mi/week`);
  console.log(`  Target Peak: ${feasibilityResult.recommendations.targetPeakMileage} mi/week`);
  console.log(`  Target Long Run: ${feasibilityResult.recommendations.targetPeakLongRun} mi`);

  if (feasibilityResult.warnings.length > 0) {
    console.log("\n  Warnings:");
    for (const warning of feasibilityResult.warnings) {
      console.log(`    ⚠️ ${warning}`);
    }
  }

  // Get race requirements
  let requirements = getRaceRequirements("50mi")!; // Use 50mi requirements
  requirements = adjustForElevation(requirements, RACE_ELEVATION);

  const raceRequirements: RaceRequirementsSummary = {
    distanceMiles: RACE_DISTANCE_MILES,
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

  const goal: RaceGoal = {
    raceDistance: RACE_DISTANCE,
    raceDate: Date.now() + WEEKS_UNTIL_RACE * 7 * 24 * 60 * 60 * 1000,
    elevation: RACE_ELEVATION,
    terrainType: "trail",
  };

  const input: PlanGenerationInput = {
    athlete,
    goal,
    constraints: { preferredLongRunDay: "Saturday" },
    raceRequirements,
    feasibility,
  };

  // Generate plan
  console.log("\n⏳ Generating training plan...\n");
  const startTime = Date.now();
  const output = await generatePlan(input);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Plan generated in ${duration}s\n`);

  // Print weekly summary
  console.log("═".repeat(70));
  console.log("  WEEKLY SUMMARY");
  console.log("═".repeat(70));
  console.log("  Week  Phase              Miles    Long Run");
  console.log("  ────  ─────              ─────    ────────");

  for (const week of output.plan.weeks) {
    const miles = calculateWeekMiles(week);
    const weekNum = week.weekNumber.toString().padStart(2);
    const phase = week.phase.substring(0, 16).padEnd(16);
    const milesStr = miles.toFixed(1).padStart(6) + "mi";

    // Find long run
    const longRunBlock = week.days
      .flatMap(d => d.workouts.flatMap(w => w.blocks))
      .find(b => b.type === "longRun");
    const longRun = longRunBlock
      ? `${blockToMiles(longRunBlock).toFixed(0)}mi`
      : "-";

    console.log(`  ${weekNum}    ${phase} ${milesStr}    ${longRun}`);
  }

  // Print detailed weeks
  console.log("\n\n" + "═".repeat(70));
  console.log("  DETAILED WEEKLY BREAKDOWN");
  console.log("═".repeat(70));

  for (const week of output.plan.weeks) {
    const weekMiles = calculateWeekMiles(week);
    console.log(`\n  WEEK ${week.weekNumber}: ${week.phase} (${weekMiles.toFixed(1)}mi)`);
    console.log("  " + "─".repeat(60));

    for (const day of week.days) {
      const blocks = day.workouts.flatMap(w => w.blocks);
      const isRest = blocks.every(b => b.type === "rest");

      if (isRest) {
        console.log(`    ${day.dayOfWeek.substring(0, 3)}: Rest`);
      } else {
        const activeBlocks = blocks.filter(b => b.value > 0 && b.type !== "rest");
        const desc = activeBlocks.map(formatBlock).join(" + ");
        const dayMiles = blocks.reduce((s, b) => s + blockToMiles(b), 0);
        console.log(`    ${day.dayOfWeek.substring(0, 3)}: ${desc} (${dayMiles.toFixed(1)}mi)`);
      }
    }
  }

  // Score the plan with race-appropriateness
  console.log("\n\n" + "═".repeat(70));
  console.log("  PLAN EVALUATION");
  console.log("═".repeat(70));

  // Build the TrainingPlan type for evaluation
  const evalPlan = {
    id: output.plan.id,
    userId: output.plan.userId,
    totalWeeks: output.plan.totalWeeks,
    weeks: output.plan.weeks,
  };

  // Evaluate with race type (use 50mi as closest match for 60k)
  const evalResult = evaluatePlan(evalPlan, "50mi");

  const evalEmoji = (score: number) => score >= 80 ? "✅" : score >= 60 ? "⚠️" : "❌";

  console.log("\n  Scores:");
  console.log(`    Structural:         ${evalEmoji(evalResult.structural.score)} ${evalResult.structural.score}%`);
  console.log(`    Safety:             ${evalEmoji(evalResult.safety.score)} ${evalResult.safety.score}%`);
  console.log(`    Methodology:        ${evalEmoji(evalResult.methodology.score)} ${evalResult.methodology.score}%`);

  if (evalResult.raceAppropriateness) {
    console.log(`    Race Appropriateness: ${evalEmoji(evalResult.raceAppropriateness.score)} ${evalResult.raceAppropriateness.score}%`);
    console.log(`\n  Race Stats:`);
    console.log(`    Peak Weekly: ${evalResult.raceAppropriateness.peakWeeklyMiles.toFixed(1)}mi`);
    console.log(`    Peak Long Run: ${evalResult.raceAppropriateness.peakLongRunMiles.toFixed(1)}mi`);
    console.log(`    Has Key Workouts: ${evalResult.raceAppropriateness.hasKeyWorkouts ? "Yes" : "No"}`);

    if (evalResult.raceAppropriateness.issues.length > 0) {
      console.log(`\n  Issues:`);
      for (const issue of evalResult.raceAppropriateness.issues) {
        console.log(`    ⚠️ ${issue}`);
      }
    }
  }

  console.log(`\n  ─────────────────────────────`);
  console.log(`  OVERALL:              ${evalEmoji(evalResult.overall)} ${evalResult.overall}%`);

  // Safety violations
  if (evalResult.safety.violations.length > 0) {
    console.log("\n  Safety Violations:");
    for (const v of evalResult.safety.violations.slice(0, 5)) {
      console.log(`    ${v.severity === "critical" ? "❌" : "⚠️"} ${v.message}`);
    }
  }

  // Methodology issues
  if (evalResult.methodology.issues.length > 0) {
    console.log("\n  Methodology Notes:");
    for (const issue of evalResult.methodology.issues) {
      console.log(`    • ${issue}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("  END OF PLAN");
  console.log("═".repeat(70) + "\n");
}

main().catch(console.error);
