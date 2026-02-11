#!/usr/bin/env npx tsx
/**
 * Test Plan Generation V2 with mock data
 * Tests the volume progression and block structure fixes
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generatePlan } from "../lib/agents/pipeline";
import { analyzeFeasibility } from "../lib/planning/feasibility";
import { getRaceRequirements, adjustForElevation } from "../lib/planning/race-requirements";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
  RaceRequirementsSummary,
  FeasibilitySummary,
} from "../lib/agents/types";
import type { FitnessProfile, ExperienceProfile } from "../lib/strava/types";
import type { Week, Block } from "../lib/blocks";

// Mock athlete - currently low volume but experienced
const athlete: AthleteProfile = {
  experience: "advanced",
  weeklyMileage: 10, // Currently low
  longestRun: 8,
  ctl: 15,
  atl: 12,
  thresholdPace: 7.5, // 7:30/mi
  lifetimeMiles: 5000,
  longestRunEver: 31, // Has done 50k before
  peakWeeklyMileage: 55,
  ultraExperience: true,
  trailExperience: true,
};

// For feasibility analysis
const fitness: FitnessProfile = {
  weeklyMileage: athlete.weeklyMileage,
  longestRun: athlete.longestRun,
  ctl: athlete.ctl!,
  atl: athlete.atl!,
  estimatedThresholdPace: athlete.thresholdPace,
  updatedAt: Date.now(),
};

const experience: ExperienceProfile = {
  userId: "test",
  updatedAt: Date.now(),
  lifetimeMiles: athlete.lifetimeMiles!,
  lifetimeRuns: 500,
  lifetimeElevationFeet: 500000,
  accountAgeYears: 5,
  longestRunEver: athlete.longestRunEver!,
  peakWeeklyMileage: athlete.peakWeeklyMileage!,
  peakMonthlyMileage: athlete.peakWeeklyMileage! * 4,
  biggestClimbFeet: 10000,
  experienceLevel: athlete.experience,
  ultraExperience: athlete.ultraExperience!,
  trailExperience: athlete.trailExperience!,
  totalShoeMileage: athlete.lifetimeMiles!,
};

const goal: RaceGoal = {
  raceDistance: "50k",
  raceDate: Date.now() + 10 * 7 * 24 * 60 * 60 * 1000, // 10 weeks
  elevation: 6000,
  terrainType: "trail",
};

// Formatting helpers
function formatBlock(block: Block): string {
  if (block.type === "rest") return "Rest";
  if (block.unit === "miles") {
    return `${block.type}(${block.value}mi)`;
  }
  return `${block.type}(${block.value}min)`;
}

function blockToMiles(block: Block): number {
  if (block.type === "rest") return 0;
  if (block.unit === "miles") return block.value;
  return block.value / 10; // Assume 10 min/mile for time-based blocks
}

function calculateWeekMiles(week: Week): number {
  return week.days.reduce((sum, day) =>
    sum + day.workouts.reduce((wSum, workout) =>
      wSum + workout.blocks.reduce((bSum, block) => bSum + blockToMiles(block), 0),
    0),
  0);
}

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("  TEST PLAN GENERATION V2");
  console.log("═".repeat(70));
  console.log(`\n  Testing with mock experienced athlete at low volume (${athlete.weeklyMileage}mi/week)`);
  console.log(`  Peak experience: ${athlete.peakWeeklyMileage}mi/week | Longest ever: ${athlete.longestRunEver}mi`);
  console.log(`  Race: 50k with 6k vert in 10 weeks\n`);

  // Run feasibility analysis
  console.log("🎯 Running feasibility analysis...");
  const feasibilityResult = analyzeFeasibility({
    raceType: "50k",
    weeksUntilRace: 10,
    elevationGain: 6000,
    currentFitness: fitness,
    experience,
  });

  console.log(`  Risk: ${feasibilityResult.riskLevel} | Feasible: ${feasibilityResult.feasible}`);
  console.log(`  Recommended start: ${feasibilityResult.recommendations.startingWeeklyMileage}mi`);
  console.log(`  Target peak: ${feasibilityResult.recommendations.targetPeakMileage}mi`);
  console.log(`  Target long run: ${feasibilityResult.recommendations.targetPeakLongRun}mi`);
  console.log(`  Approach: ${feasibilityResult.recommendations.suggestedApproach.split(":")[0]}`);
  if (feasibilityResult.warnings.length > 0) {
    console.log(`  Warnings: ${feasibilityResult.warnings.length}`);
  }
  console.log();

  // Get race requirements
  let requirements = getRaceRequirements("50k")!;
  requirements = adjustForElevation(requirements, 6000);

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

  const input: PlanGenerationInput = {
    athlete,
    goal,
    constraints: { preferredLongRunDay: "Saturday" },
    raceRequirements,
    feasibility,
  };

  console.log("⏳ Generating plan...\n");

  try {
    const output = await generatePlan(input);

    // Evaluation
    if (output.evaluation) {
      const evalEmoji = (s: number) => s >= 90 ? "✅" : s >= 70 ? "⚠️" : "❌";
      console.log(`\n  Evaluation: ${evalEmoji(output.evaluation.overall)} ${output.evaluation.overall}%`);
      console.log(`    Structural: ${output.evaluation.structural}% | Safety: ${output.evaluation.safety}% | Methodology: ${output.evaluation.methodology}%`);
    }

    // Weekly summary
    console.log("\n  WEEKLY SUMMARY");
    console.log("  " + "─".repeat(60));
    console.log("  Week  Phase              Miles    Long Run");
    console.log("  ────  ─────              ─────    ────────");

    let prevMiles = 0;
    for (const week of output.plan.weeks) {
      const miles = calculateWeekMiles(week);
      const weekNum = week.weekNumber.toString().padStart(2);
      const phase = week.phase.substring(0, 16).padEnd(16);
      const milesStr = miles.toFixed(1).padStart(6) + "mi";

      // Find long run
      const longRunBlock = week.days
        .flatMap(d => d.workouts.flatMap(w => w.blocks))
        .find(b => b.type === "longRun");
      const longRun = longRunBlock && longRunBlock.unit === "miles"
        ? `${longRunBlock.value}mi`
        : "-";

      // Volume change indicator
      let change = "";
      if (prevMiles > 0) {
        const pctChange = ((miles - prevMiles) / prevMiles) * 100;
        if (pctChange > 10) change = ` ⚠️ +${pctChange.toFixed(0)}%`;
        else if (pctChange > 0) change = ` (+${pctChange.toFixed(0)}%)`;
        else if (pctChange < 0) change = ` (${pctChange.toFixed(0)}%)`;
      }
      prevMiles = miles;

      console.log(`  ${weekNum}    ${phase} ${milesStr}    ${longRun}${change}`);
    }

    // Detailed breakdown of ALL weeks
    console.log("\n  DETAILED WEEKLY BREAKDOWN");
    console.log("  " + "─".repeat(60));

    for (const week of output.plan.weeks) {
      const weekMiles = calculateWeekMiles(week);
      console.log(`\n  WEEK ${week.weekNumber}: ${week.phase} (${weekMiles.toFixed(1)}mi)`);

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

    // Check volume progression safety
    console.log("\n  VOLUME PROGRESSION CHECK");
    console.log("  " + "─".repeat(60));

    const week1Miles = calculateWeekMiles(output.plan.weeks[0]);
    if (week1Miles > athlete.weeklyMileage * 1.3) {
      console.log(`  ⚠️ Week 1 (${week1Miles.toFixed(1)}mi) is too aggressive from current ${athlete.weeklyMileage}mi`);
    } else {
      console.log(`  ✅ Week 1 volume (${week1Miles.toFixed(1)}mi) is safe increase from ${athlete.weeklyMileage}mi current`);
    }

    // Check for 10% rule violations
    let violations = 0;
    for (let i = 1; i < output.plan.weeks.length; i++) {
      const prev = calculateWeekMiles(output.plan.weeks[i - 1]);
      const curr = calculateWeekMiles(output.plan.weeks[i]);
      const isRecovery = output.plan.weeks[i].phase.toLowerCase().includes("recovery");

      if (!isRecovery && prev > 0) {
        const increase = ((curr - prev) / prev) * 100;
        if (increase > 15) { // Allow some buffer for rounding
          violations++;
          console.log(`  ⚠️ Week ${i + 1}: ${increase.toFixed(0)}% increase (${prev.toFixed(1)} → ${curr.toFixed(1)}mi)`);
        }
      }
    }

    if (violations === 0) {
      console.log(`  ✅ All week-to-week increases within safe limits`);
    }

    console.log("\n" + "═".repeat(70));
    console.log();

  } catch (error) {
    console.error("Error generating plan:", error);
    process.exit(1);
  }
}

main();
