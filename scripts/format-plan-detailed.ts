#!/usr/bin/env npx tsx
/**
 * Format a generated plan in detailed tabular format
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

// Assume ~10 min/mile easy pace for distance estimates
const EASY_PACE = 10; // min/mile
const THRESHOLD_PACE = 8.5; // min/mile

function estimateDistance(block: Block): number {
  if (block.type === "rest" || block.value === 0) return 0;
  const pace = block.effortLevel === "z4" || block.effortLevel === "z5" ? THRESHOLD_PACE : EASY_PACE;
  return block.value / pace;
}

function formatTime(mins: number): string {
  if (mins === 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatDist(miles: number): string {
  if (miles === 0) return "-";
  return `${miles.toFixed(1)}mi`;
}

function getWorkoutType(blocks: Block[]): string {
  const types = blocks.map(b => b.type);
  if (types.includes("longRun")) return "Long Run";
  if (types.includes("tempo")) return "Tempo";
  if (types.includes("intervals")) return "Intervals";
  if (types.every(t => t === "rest")) return "Rest";
  if (types.includes("easy")) return "Easy";
  return "Other";
}

function getWorkoutDescription(blocks: Block[]): string {
  const nonWarmCool = blocks.filter(b => !["warmUp", "coolDown", "rest"].includes(b.type));
  if (nonWarmCool.length === 0) {
    if (blocks.some(b => b.type === "rest")) return "Rest day";
    return "Recovery";
  }

  const parts: string[] = [];
  for (const b of nonWarmCool) {
    if (b.type === "easy") {
      parts.push(`${b.value}min easy`);
    } else if (b.type === "longRun") {
      parts.push(`${b.value}min long`);
    } else if (b.type === "tempo") {
      parts.push(`${b.value}min tempo`);
    } else if (b.type === "intervals") {
      parts.push(`${b.value}min intervals`);
    } else if (b.type === "recovery") {
      // skip recovery jogs between intervals
    }
  }
  return parts.join(" + ") || "Easy";
}

async function main() {
  const userId = "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";

  console.log("\n🏃 Loading athlete data and generating plan...\n");

  // Load fitness profile
  const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
  const fitnessSnap = await fitnessRef.get();
  const fitness = fitnessSnap.data()!;

  // Build athlete profile
  let experience: "beginner" | "intermediate" | "advanced" = "intermediate";
  if (fitness.ctl < 20 && fitness.weeklyMileage < 20) experience = "beginner";
  else if (fitness.ctl > 60 && fitness.longestRun > 20) experience = "advanced";

  const athlete: AthleteProfile = {
    experience,
    weeklyMileage: fitness.weeklyMileage,
    longestRun: fitness.longestRun,
    currentFitness: `CTL: ${fitness.ctl}, ATL: ${fitness.atl}, TSB: ${fitness.tsb}`,
  };

  const raceDate = Date.now() + 10 * 7 * 24 * 60 * 60 * 1000;
  const goal: RaceGoal = {
    raceDistance: "50k",
    raceDate,
    elevation: 6000,
    terrainType: "trail",
  };

  const output = await generatePlan({ athlete, goal });

  // Print detailed plan
  console.log("\n");
  console.log("═".repeat(100));
  console.log("  50K ULTRA TRAINING PLAN - 10 WEEKS");
  console.log("  Based on: CTL " + fitness.ctl + " | Weekly " + fitness.weeklyMileage + "mi | Long " + fitness.longestRun + "mi");
  console.log("═".repeat(100));
  console.log();
  console.log(`  Evaluation: ${output.evaluation?.overall}% (Structural: ${output.evaluation?.structural}%, Safety: ${output.evaluation?.safety}%, Methodology: ${output.evaluation?.methodology}%)`);
  console.log();

  // Summary table header
  console.log("─".repeat(100));
  console.log("  WEEKLY SUMMARY");
  console.log("─".repeat(100));
  console.log("  Week  Phase              Volume    Distance   Long Run    Key Workout");
  console.log("  ────  ─────              ──────    ────────   ────────    ───────────");

  for (const week of output.plan.weeks) {
    const totalMins = week.days.reduce((s, d) =>
      s + d.workouts.reduce((ws, w) =>
        ws + w.blocks.reduce((bs, b) => bs + b.value, 0), 0), 0);

    const totalDist = week.days.reduce((s, d) =>
      s + d.workouts.reduce((ws, w) =>
        ws + w.blocks.reduce((bs, b) => bs + estimateDistance(b), 0), 0), 0);

    // Find long run
    let longRunMins = 0;
    let longRunDist = 0;
    for (const day of week.days) {
      for (const workout of day.workouts) {
        for (const block of workout.blocks) {
          if (block.type === "longRun") {
            longRunMins = block.value;
            longRunDist = estimateDistance(block);
          }
        }
      }
    }

    // Find key workout (non-easy, non-long)
    let keyWorkout = "-";
    for (const day of week.days) {
      for (const workout of day.workouts) {
        const hasIntensity = workout.blocks.some(b =>
          b.type === "tempo" || b.type === "intervals");
        if (hasIntensity) {
          const desc = getWorkoutDescription(workout.blocks);
          if (desc !== "Easy" && desc !== "Rest day") keyWorkout = desc;
        }
      }
    }

    const weekNum = week.weekNumber.toString().padStart(2);
    const phase = week.phase.padEnd(16);
    const volume = formatTime(totalMins).padStart(6);
    const dist = formatDist(totalDist).padStart(8);
    const longR = longRunMins > 0 ? `${formatTime(longRunMins)} (${formatDist(longRunDist)})`.padStart(12) : "-".padStart(12);

    console.log(`  ${weekNum}    ${phase} ${volume}    ${dist}   ${longR}    ${keyWorkout}`);
  }

  console.log();
  console.log("─".repeat(100));
  console.log("  DETAILED DAILY BREAKDOWN");
  console.log("─".repeat(100));

  for (const week of output.plan.weeks) {
    const totalMins = week.days.reduce((s, d) =>
      s + d.workouts.reduce((ws, w) =>
        ws + w.blocks.reduce((bs, b) => bs + b.value, 0), 0), 0);
    const totalDist = week.days.reduce((s, d) =>
      s + d.workouts.reduce((ws, w) =>
        ws + w.blocks.reduce((bs, b) => bs + estimateDistance(b), 0), 0), 0);

    console.log();
    console.log(`  WEEK ${week.weekNumber}: ${week.phase.toUpperCase()}  |  ${formatTime(totalMins)} / ${formatDist(totalDist)}`);
    console.log("  " + "─".repeat(70));
    console.log("  Day         Type        Time      Dist     Description");
    console.log("  ───         ────        ────      ────     ───────────");

    for (const day of week.days) {
      const blocks = day.workouts.flatMap(w => w.blocks);
      const dayMins = blocks.reduce((s, b) => s + b.value, 0);
      const dayDist = blocks.reduce((s, b) => s + estimateDistance(b), 0);
      const type = getWorkoutType(blocks);
      const desc = getWorkoutDescription(blocks);

      const dayName = day.dayOfWeek.substring(0, 3).padEnd(10);
      const typeStr = type.padEnd(10);
      const timeStr = formatTime(dayMins).padStart(6);
      const distStr = formatDist(dayDist).padStart(6);

      console.log(`  ${dayName}  ${typeStr}  ${timeStr}    ${distStr}   ${desc}`);
    }
  }

  console.log();
  console.log("═".repeat(100));
  console.log();
}

main().catch(console.error);
