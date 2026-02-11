#!/usr/bin/env npx tsx
/**
 * Generate Training Plan V2
 *
 * Uses full Strava data (fitness + experience) and feasibility analysis
 * to generate a smarter, more personalized training plan.
 *
 * Usage: npx tsx scripts/generate-plan-v2.ts <userId> --race <type> --weeks <N> [--elevation <ft>]
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
import type { FitnessProfile, ExperienceProfile } from "../lib/strava/types";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
  RaceRequirementsSummary,
  FeasibilitySummary,
} from "../lib/agents/types";
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
// Formatting Helpers
// =============================================================================

const EASY_PACE = 10; // min/mile estimate for volume calculations

function formatTime(mins: number): string {
  if (mins === 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatBlock(block: Block): string {
  if (block.type === "rest") return "Rest";
  if (block.unit === "miles") {
    return `${block.type}(${block.value}mi)`;
  }
  return `${block.type}(${block.value}min)`;
}

function blockToMinutes(block: Block): number {
  if (block.type === "rest") return 0;
  if (block.unit === "miles") {
    return block.value * EASY_PACE;
  }
  return block.value;
}

function blockToMiles(block: Block): number {
  if (block.type === "rest") return 0;
  if (block.unit === "miles") {
    return block.value;
  }
  const pace = block.effortLevel === "z4" || block.effortLevel === "z5" ? 8.5 : EASY_PACE;
  return block.value / pace;
}

function calculateWeekStats(week: Week) {
  let totalMins = 0;
  let totalDist = 0;
  let longRunMiles = 0;

  for (const day of week.days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        totalMins += blockToMinutes(block);
        totalDist += blockToMiles(block);
        if (block.type === "longRun" && block.unit === "miles") {
          longRunMiles = Math.max(longRunMiles, block.value);
        }
      }
    }
  }

  return { totalMins, totalDist, longRunMiles };
}

// =============================================================================
// Main
// =============================================================================

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

  console.log("\n═".repeat(70));
  console.log("  TRAINING PLAN GENERATION V2");
  console.log("═".repeat(70));
  console.log(`\n  Race: ${raceType} | Weeks: ${weeks} | Elevation: ${elevation.toLocaleString()} ft\n`);

  // Load fitness profile
  console.log("📊 Loading athlete data...\n");
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

  // Display athlete summary
  console.log("  ATHLETE PROFILE");
  console.log("  " + "─".repeat(40));
  console.log(`  Current State (last 12 weeks):`);
  console.log(`    Weekly Mileage: ${fitness.weeklyMileage} mi | CTL: ${fitness.ctl}`);
  console.log(`    Longest Recent Run: ${fitness.longestRun} mi`);
  console.log(`  Lifetime Experience:`);
  console.log(`    Total Miles: ${experience.lifetimeMiles.toLocaleString()} | Runs: ${experience.lifetimeRuns}`);
  console.log(`    Longest Ever: ${experience.longestRunEver} mi | Peak Week: ${experience.peakWeeklyMileage} mi`);
  console.log(`    Level: ${experience.experienceLevel.toUpperCase()} | Ultra: ${experience.ultraExperience ? "Yes" : "No"}`);
  console.log();

  // Run feasibility analysis
  console.log("🎯 Running feasibility analysis...\n");
  const feasibilityResult = analyzeFeasibility({
    raceType,
    weeksUntilRace: weeks,
    elevationGain: elevation,
    currentFitness: fitness,
    experience,
  });

  // Display feasibility
  const statusEmoji = feasibilityResult.feasible ? "✅" : "❌";
  const riskEmoji = { low: "🟢", moderate: "🟡", high: "🟠", extreme: "🔴" }[feasibilityResult.riskLevel];
  console.log(`  ${statusEmoji} Feasible: ${feasibilityResult.feasible ? "YES" : "NO"} | ${riskEmoji} Risk: ${feasibilityResult.riskLevel}`);
  console.log(`  Approach: ${feasibilityResult.recommendations.suggestedApproach.split(":")[0]}`);
  if (feasibilityResult.warnings.length > 0) {
    console.log(`  Warnings: ${feasibilityResult.warnings.length}`);
  }
  console.log();

  if (!feasibilityResult.feasible) {
    console.log("❌ Goal is not feasible. Blockers:");
    for (const b of feasibilityResult.blockers) {
      console.log(`   • ${b}`);
    }
    process.exit(1);
  }

  // Get race requirements
  let requirements = getRaceRequirements(raceType)!;
  if (elevation > 1000) {
    requirements = adjustForElevation(requirements, elevation);
  }

  // Build athlete profile for pipeline
  const athlete: AthleteProfile = {
    experience: experience.experienceLevel,
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

  const raceDate = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
  const goal: RaceGoal = {
    raceDistance: raceType,
    raceDate,
    elevation,
    terrainType: "trail",
  };

  const raceRequirements: RaceRequirementsSummary = {
    distanceMiles: requirements.distanceMiles,
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

  // Generate plan
  console.log("⏳ Generating training plan...\n");

  const input: PlanGenerationInput = {
    athlete,
    goal,
    constraints: { preferredLongRunDay: "Saturday" },
    raceRequirements,
    feasibility,
  };

  const output = await generatePlan(input);

  // Display results
  console.log("\n" + "═".repeat(70));
  console.log("  GENERATED PLAN");
  console.log("═".repeat(70));

  // Evaluation
  if (output.evaluation) {
    const evalEmoji = (s: number) => s >= 90 ? "✅" : s >= 70 ? "⚠️" : "❌";
    console.log(`\n  Evaluation: ${evalEmoji(output.evaluation.overall)} ${output.evaluation.overall}%`);
    console.log(`    Structural: ${output.evaluation.structural}% | Safety: ${output.evaluation.safety}% | Methodology: ${output.evaluation.methodology}%`);
  }

  // Weekly summary table
  console.log("\n  WEEKLY SUMMARY");
  console.log("  " + "─".repeat(60));
  console.log("  Week  Phase              Volume     Miles    Long Run");
  console.log("  ────  ─────              ──────     ─────    ────────");

  for (const week of output.plan.weeks) {
    const stats = calculateWeekStats(week);
    const weekNum = week.weekNumber.toString().padStart(2);
    const phase = week.phase.substring(0, 16).padEnd(16);
    const volume = formatTime(stats.totalMins).padStart(8);
    const miles = stats.totalDist.toFixed(1).padStart(6) + "mi";
    const longRun = stats.longRunMiles > 0 ? `${stats.longRunMiles}mi` : "-";
    console.log(`  ${weekNum}    ${phase} ${volume}    ${miles}    ${longRun}`);
  }

  // Detailed weekly breakdown
  console.log("\n  DETAILED BREAKDOWN");
  console.log("  " + "─".repeat(60));

  for (const week of output.plan.weeks) {
    const stats = calculateWeekStats(week);
    console.log(`\n  WEEK ${week.weekNumber}: ${week.phase} (${formatTime(stats.totalMins)} / ${stats.totalDist.toFixed(1)}mi)`);

    for (const day of week.days) {
      const blocks = day.workouts.flatMap(w => w.blocks);
      const isRest = blocks.every(b => b.type === "rest");

      if (isRest) {
        console.log(`    ${day.dayOfWeek.substring(0, 3)}: Rest`);
      } else {
        const dayMins = blocks.reduce((s, b) => s + blockToMinutes(b), 0);
        const dayDist = blocks.reduce((s, b) => s + blockToMiles(b), 0);
        const activeBlocks = blocks.filter(b => b.value > 0 && b.type !== "rest");
        const desc = activeBlocks.map(formatBlock).join(" + ");
        console.log(`    ${day.dayOfWeek.substring(0, 3)}: ${formatTime(dayMins)} / ${dayDist.toFixed(1)}mi - ${desc}`);
      }
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log();
}

main().catch(console.error);
