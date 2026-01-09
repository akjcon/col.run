/**
 * Pipeline Integration Test Script
 *
 * Runs the plan generation pipeline with real LLM calls
 * against mock athlete profiles to evaluate output quality.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts [athleteId]
 *
 * Examples:
 *   npx tsx scripts/test-pipeline.ts                    # Run all athletes
 *   npx tsx scripts/test-pipeline.ts beginner-half      # Run specific athlete
 */

import * as dotenv from "dotenv";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });

import { PlanGenerationPipeline } from "../lib/agents/pipeline";
import { evaluatePlan } from "../lib/plan-evaluation";
import { testAthletes, getAthleteById } from "../tests/fixtures/athletes/profiles";
import type { TestAthlete } from "../tests/fixtures/athletes/profiles";
import type { PlanGenerationOutput } from "../lib/agents/types";

// =============================================================================
// Configuration
// =============================================================================

const OUTPUT_DIR = join(process.cwd(), "test-output", "plans");

// =============================================================================
// Main Script
// =============================================================================

async function runPipeline(athlete: TestAthlete): Promise<{
  athlete: TestAthlete;
  result: PlanGenerationOutput | null;
  error?: string;
  duration: number;
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🏃 ${athlete.name}`);
  console.log(`   ${athlete.description}`);
  console.log(`${"=".repeat(60)}`);

  const startTime = Date.now();

  try {
    const pipeline = new PlanGenerationPipeline({
      parallelWeeks: false, // Sequential for better context
      retryFailedWeeks: true,
      maxRetries: 2,
    });

    console.log(`\n📋 Generating plan...`);
    console.log(`   Experience: ${athlete.profile.experience}`);
    console.log(`   Current mileage: ${athlete.profile.weeklyMileage} mi/week`);
    console.log(`   Goal: ${athlete.goal.raceDistance}`);
    if (athlete.goal.targetTime) {
      console.log(`   Target time: ${athlete.goal.targetTime}`);
    }

    const result = await pipeline.generate({
      athlete: athlete.profile,
      goal: athlete.goal,
      constraints: athlete.constraints,
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ Plan generated in ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Total weeks: ${result.plan.totalWeeks}`);
    console.log(`   Phases: ${result.plan.phases.map(p => p.name).join(" → ")}`);

    // Print evaluation scores
    if (result.evaluation) {
      console.log(`\n📊 Evaluation Scores:`);
      console.log(`   Structural: ${result.evaluation.structural}%`);
      console.log(`   Safety: ${result.evaluation.safety}%`);
      console.log(`   Methodology: ${result.evaluation.methodology}%`);
      console.log(`   Overall: ${result.evaluation.overall}%`);
    }

    // Run detailed evaluation to get violation details
    const detailedEval = evaluatePlan({
      id: result.plan.id,
      userId: result.plan.userId,
      totalWeeks: result.plan.totalWeeks,
      weeks: result.plan.weeks,
    });

    if (detailedEval.safety.violations.length > 0) {
      console.log(`\n⚠️  Safety Violations:`);
      for (const v of detailedEval.safety.violations) {
        console.log(`   [${v.severity}] Week ${v.weekNumber}: ${v.message}`);
      }
    }

    // Print trace summary
    const totalTokens = result.traces.reduce(
      (sum, t) => sum + (t.inputTokens || 0) + (t.outputTokens || 0),
      0
    );
    console.log(`\n💰 Token Usage: ${totalTokens.toLocaleString()} tokens`);

    return { athlete, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Failed: ${errorMessage}`);
    return { athlete, result: null, error: errorMessage, duration };
  }
}

async function saveResult(
  athlete: TestAthlete,
  result: PlanGenerationOutput
): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const filename = `${athlete.id}-${Date.now()}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  const output = {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      description: athlete.description,
      profile: athlete.profile,
      goal: athlete.goal,
      constraints: athlete.constraints,
    },
    plan: result.plan,
    evaluation: result.evaluation,
    traces: result.traces.map(t => ({
      agentName: t.agentName,
      durationMs: t.durationMs,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      error: t.error,
    })),
    generatedAt: new Date().toISOString(),
  };

  await writeFile(filepath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved to: ${filepath}`);
}

function printWeekSummary(result: PlanGenerationOutput): void {
  console.log(`\n📅 Week Summary:`);
  console.log(`${"─".repeat(50)}`);

  for (const week of result.plan.weeks) {
    const totalMinutes = week.days.reduce((sum, day) => {
      return sum + day.workouts.reduce((wSum, workout) => {
        return wSum + workout.blocks.reduce((bSum, block) => bSum + block.value, 0);
      }, 0);
    }, 0);

    const hardDays = week.days.filter(day =>
      day.workouts.some(w =>
        w.blocks.some(b =>
          b.type === "intervals" || b.type === "tempo" ||
          b.effortLevel === "z4" || b.effortLevel === "z5"
        )
      )
    ).length;

    const restDays = week.days.filter(day =>
      day.workouts.every(w => w.blocks.every(b => b.type === "rest"))
    ).length;

    console.log(
      `Week ${week.weekNumber.toString().padStart(2)} (${week.phase.padEnd(15)}): ` +
      `${totalMinutes.toString().padStart(3)} min | ` +
      `${hardDays} hard | ${restDays} rest`
    );
  }
}

async function main(): Promise<void> {
  console.log("🚀 Pipeline Integration Test");
  console.log("============================\n");

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment");
    console.error("   Make sure .env.local contains your API key");
    process.exit(1);
  }

  // Determine which athletes to test
  const athleteId = process.argv[2];
  let athletesToTest: TestAthlete[];

  if (athleteId) {
    const athlete = getAthleteById(athleteId);
    if (!athlete) {
      console.error(`❌ Unknown athlete ID: ${athleteId}`);
      console.error(`   Available IDs: ${testAthletes.map(a => a.id).join(", ")}`);
      process.exit(1);
    }
    athletesToTest = [athlete];
  } else {
    athletesToTest = testAthletes;
    console.log(`Testing ${athletesToTest.length} athlete profiles:\n`);
    for (const athlete of athletesToTest) {
      console.log(`  • ${athlete.id}: ${athlete.name}`);
    }
  }

  // Run pipeline for each athlete
  const results: Array<{
    athlete: TestAthlete;
    result: PlanGenerationOutput | null;
    error?: string;
    duration: number;
  }> = [];

  for (const athlete of athletesToTest) {
    const result = await runPipeline(athlete);
    results.push(result);

    if (result.result) {
      printWeekSummary(result.result);
      await saveResult(athlete, result.result);
    }
  }

  // Print summary
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("📊 SUMMARY");
  console.log(`${"=".repeat(60)}\n`);

  const successful = results.filter(r => r.result !== null);
  const failed = results.filter(r => r.result === null);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log(`\n📈 Evaluation Scores:`);
    console.log(`${"─".repeat(50)}`);

    for (const r of successful) {
      const eval_ = r.result!.evaluation!;
      console.log(
        `${r.athlete.id.padEnd(20)} | ` +
        `S:${eval_.structural.toString().padStart(3)} | ` +
        `Safe:${eval_.safety.toString().padStart(3)} | ` +
        `Meth:${eval_.methodology.toString().padStart(3)} | ` +
        `Overall:${eval_.overall.toString().padStart(3)}`
      );
    }

    // Average scores
    const avgStructural = Math.round(
      successful.reduce((sum, r) => sum + r.result!.evaluation!.structural, 0) / successful.length
    );
    const avgSafety = Math.round(
      successful.reduce((sum, r) => sum + r.result!.evaluation!.safety, 0) / successful.length
    );
    const avgMethodology = Math.round(
      successful.reduce((sum, r) => sum + r.result!.evaluation!.methodology, 0) / successful.length
    );
    const avgOverall = Math.round(
      successful.reduce((sum, r) => sum + r.result!.evaluation!.overall, 0) / successful.length
    );

    console.log(`${"─".repeat(50)}`);
    console.log(
      `${"AVERAGE".padEnd(20)} | ` +
      `S:${avgStructural.toString().padStart(3)} | ` +
      `Safe:${avgSafety.toString().padStart(3)} | ` +
      `Meth:${avgMethodology.toString().padStart(3)} | ` +
      `Overall:${avgOverall.toString().padStart(3)}`
    );
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed Athletes:`);
    for (const r of failed) {
      console.log(`   ${r.athlete.id}: ${r.error}`);
    }
  }

  // Total duration and cost estimate
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalTokens = successful.reduce((sum, r) => {
    return sum + r.result!.traces.reduce(
      (tSum, t) => tSum + (t.inputTokens || 0) + (t.outputTokens || 0),
      0
    );
  }, 0);

  console.log(`\n⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`💰 Total tokens: ${totalTokens.toLocaleString()}`);
  console.log(`💵 Estimated cost: $${((totalTokens / 1000) * 0.003).toFixed(2)}`);

  console.log(`\n📁 Plans saved to: ${OUTPUT_DIR}`);
}

// Run
main().catch(console.error);
