#!/usr/bin/env npx tsx
/**
 * Generate Training Plan for User
 *
 * Loads fitness data from Firestore and generates a personalized plan.
 *
 * Usage: npx tsx scripts/generate-plan-for-user.ts <userId> [options]
 *
 * Options:
 *   --race <type>       Race type (e.g., "50k", "marathon", "half")
 *   --weeks <number>    Weeks until race
 *   --elevation <feet>  Total elevation gain
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
import type { AthleteProfile, RaceGoal, PlanGenerationInput } from "../lib/agents/types";
import type { Week, Day, Block } from "../lib/blocks";

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

function formatPace(minPerMile: number): string {
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function blockTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    warmUp: "🔥",
    coolDown: "❄️",
    easy: "🏃",
    tempo: "⚡",
    intervals: "💨",
    longRun: "🏔️",
    recovery: "🚶",
    rest: "😴",
  };
  return emojis[type] || "•";
}

function effortLabel(level: string): string {
  const labels: Record<string, string> = {
    z1: "Recovery",
    z2: "Easy",
    z3: "Moderate",
    z4: "Threshold",
    z5: "VO2max",
  };
  return labels[level] || level;
}

function formatBlock(block: Block): string {
  if (block.type === "rest") return "Rest";
  const emoji = blockTypeEmoji(block.type);
  const effort = effortLabel(block.effortLevel);
  return `${emoji} ${block.type} ${block.value}min @ ${effort}`;
}

function formatDay(day: Day): string {
  const blocks = day.workouts.flatMap(w => w.blocks);
  if (blocks.length === 1 && blocks[0].type === "rest") {
    return "😴 Rest Day";
  }
  const totalMins = blocks.reduce((sum, b) => sum + b.value, 0);
  const summary = blocks.map(formatBlock).join(" → ");
  return `${formatDuration(totalMins)} | ${summary}`;
}

function formatWeek(week: Week): string {
  const lines: string[] = [];
  lines.push(`\n${"═".repeat(70)}`);
  lines.push(`WEEK ${week.weekNumber}: ${week.phase.toUpperCase()}`);
  lines.push(`${"─".repeat(70)}`);

  const totalMins = week.days.reduce(
    (sum, d) => sum + d.workouts.reduce(
      (wSum, w) => wSum + w.blocks.reduce((bSum, b) => bSum + b.value, 0), 0
    ), 0
  );

  lines.push(`Total Volume: ${formatDuration(totalMins)}\n`);

  for (const day of week.days) {
    const dayStr = day.dayOfWeek.padEnd(10);
    lines.push(`  ${dayStr} ${formatDay(day)}`);
  }

  return lines.join("\n");
}

function printPlan(output: Awaited<ReturnType<typeof generatePlan>>): void {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║                    GENERATED TRAINING PLAN                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");

  // Evaluation Summary
  console.log("\n📊 EVALUATION SCORES");
  console.log("─".repeat(40));
  if (output.evaluation) {
    const evalEmoji = (score: number) => score >= 90 ? "✅" : score >= 70 ? "⚠️" : "❌";
    console.log(`  Structural:   ${evalEmoji(output.evaluation.structural)} ${output.evaluation.structural}%`);
    console.log(`  Safety:       ${evalEmoji(output.evaluation.safety)} ${output.evaluation.safety}%`);
    console.log(`  Methodology:  ${evalEmoji(output.evaluation.methodology)} ${output.evaluation.methodology}%`);
    console.log(`  ─────────────────────`);
    console.log(`  OVERALL:      ${evalEmoji(output.evaluation.overall)} ${output.evaluation.overall}%`);
  }

  // Phase Overview
  console.log("\n\n📅 PHASE OVERVIEW");
  console.log("─".repeat(40));
  for (const phase of output.plan.phases) {
    console.log(`  Weeks ${phase.startWeek}-${phase.endWeek}: ${phase.name}`);
    console.log(`    Focus: ${phase.focus}`);
    console.log(`    Key Workouts: ${phase.keyWorkouts.join(", ")}`);
    console.log();
  }

  // Weekly Plans
  console.log("\n📋 WEEKLY BREAKDOWN");
  for (const week of output.plan.weeks) {
    console.log(formatWeek(week));
  }

  console.log("\n" + "═".repeat(70));
  console.log("END OF PLAN");
  console.log("═".repeat(70) + "\n");
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0] || "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";

  // Parse options
  const raceTypeIdx = args.indexOf("--race");
  const weeksIdx = args.indexOf("--weeks");
  const elevIdx = args.indexOf("--elevation");

  const raceType = raceTypeIdx !== -1 ? args[raceTypeIdx + 1] : "50k";
  const weeks = weeksIdx !== -1 ? parseInt(args[weeksIdx + 1]) : 10;
  const elevation = elevIdx !== -1 ? parseInt(args[elevIdx + 1]) : 6000;

  console.log("\n🏃 Loading athlete data from Firestore...\n");

  // Load fitness profile
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  const fitnessSnap = await fitnessRef.get();

  if (!fitnessSnap.exists) {
    console.error("No fitness profile found. Please sync Strava first.");
    process.exit(1);
  }

  const fitness = fitnessSnap.data()!;

  // Determine experience level based on metrics
  let experience: "beginner" | "intermediate" | "advanced" = "intermediate";
  if (fitness.ctl < 20 && fitness.weeklyMileage < 20) {
    experience = "beginner";
  } else if (fitness.ctl > 60 && fitness.longestRun > 20) {
    experience = "advanced";
  }

  // Build athlete profile from Strava data
  const athlete: AthleteProfile = {
    experience,
    weeklyMileage: fitness.weeklyMileage,
    longestRun: fitness.longestRun,
    currentFitness: `CTL: ${fitness.ctl}, ATL: ${fitness.atl}, TSB: ${fitness.tsb}`,
    background: fitness.estimatedThresholdPace
      ? `Threshold pace: ${formatPace(fitness.estimatedThresholdPace)}`
      : undefined,
  };

  console.log("📊 Athlete Profile (from Strava):");
  console.log(`   Experience: ${experience}`);
  console.log(`   Weekly Mileage: ${fitness.weeklyMileage} miles`);
  console.log(`   Longest Run: ${fitness.longestRun} miles`);
  console.log(`   CTL/ATL/TSB: ${fitness.ctl}/${fitness.atl}/${fitness.tsb}`);
  if (fitness.estimatedThresholdPace) {
    console.log(`   Threshold Pace: ${formatPace(fitness.estimatedThresholdPace)}`);
  }

  // Build race goal
  const raceDate = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
  const goal: RaceGoal = {
    raceDistance: raceType,
    raceDate,
    elevation,
    terrainType: "trail",
    raceName: `${raceType} Ultra`,
  };

  console.log(`\n🎯 Race Goal:`);
  console.log(`   Distance: ${raceType}`);
  console.log(`   Weeks Out: ${weeks}`);
  console.log(`   Elevation: ${elevation.toLocaleString()} ft`);
  console.log(`   Terrain: Trail\n`);

  // Generate plan
  console.log("⏳ Generating training plan...\n");

  const input: PlanGenerationInput = {
    athlete,
    goal,
    constraints: {
      preferredLongRunDay: "Saturday",
    },
  };

  const output = await generatePlan(input);

  // Print the plan
  printPlan(output);
}

main().catch(console.error);
