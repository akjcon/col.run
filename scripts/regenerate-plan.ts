#!/usr/bin/env npx tsx
/**
 * Regenerate Training Plan for a User
 *
 * Mirrors the logic in app/api/generate-plan/route.ts but runs server-side
 * as a one-shot script. Reads the user's latest training background,
 * enriches the athlete profile from their athleteSnapshot (Strava data),
 * runs the pipeline, deactivates the old plan, and persists the new one
 * alongside fresh pipeline logs.
 *
 * Usage: npx tsx scripts/regenerate-plan.ts <userId>
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PlanGenerationPipeline } from "@/lib/agents/pipeline";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
} from "@/lib/agents/types";
import type { TrainingBackground } from "@/lib/types";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      type: "service_account",
      project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
    } as unknown as ServiceAccount),
  });
}

const db = getFirestore();

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx scripts/regenerate-plan.ts <userId>");
    process.exit(1);
  }

  console.log(`\n🏃 Regenerating plan for ${userId}\n`);

  // 1. Load latest training background
  const bgSnap = await db
    .collection("users")
    .doc(userId)
    .collection("backgrounds")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (bgSnap.empty) {
    console.error("No training background found for user");
    process.exit(1);
  }

  const bg = bgSnap.docs[0].data() as TrainingBackground;
  console.log("📋 Training Background:");
  console.log(`   Goal: ${bg.goals.raceDistance}`);
  console.log(
    `   Race date: ${bg.goals.raceDate ? new Date(bg.goals.raceDate).toISOString().split("T")[0] : "N/A"}`
  );
  console.log(`   Elevation: ${bg.goals.elevation ?? "N/A"} ft`);
  console.log(`   Strava connected: ${bg.stravaConnected}`);

  // 2. Build athlete profile from training background
  const athlete: AthleteProfile = {
    experience: bg.experience,
    weeklyMileage: bg.weeklyMileage,
    longestRun: bg.longestRun,
    marathonPR: bg.marathonPR,
    currentFitness: bg.currentFitness,
    background: bg.background,
    injuries: bg.injuries,
  };

  // 3. Enrich from athleteSnapshot (same logic as generate-plan route)
  const snapDoc = await db
    .collection("users")
    .doc(userId)
    .collection("athleteSnapshot")
    .doc("current")
    .get();

  if (snapDoc.exists) {
    const snap = snapDoc.data()!;
    if (snap.ctl) athlete.ctl = snap.ctl;
    if (snap.atl) athlete.atl = snap.atl;
    if (snap.currentWeeklyMileage) athlete.weeklyMileage = snap.currentWeeklyMileage;
    if (snap.currentLongestRun) athlete.longestRun = snap.currentLongestRun;
    else if (snap.longestRunEver) athlete.longestRun = snap.longestRunEver;
    if (snap.estimatedThresholdPace) athlete.thresholdPace = snap.estimatedThresholdPace;
    if (snap.lifetimeMiles) athlete.lifetimeMiles = snap.lifetimeMiles;
    if (snap.longestRunEver) athlete.longestRunEver = snap.longestRunEver;
    if (snap.peakWeeklyMileage) athlete.peakWeeklyMileage = snap.peakWeeklyMileage;
    if (snap.ultraExperience !== undefined)
      athlete.ultraExperience = snap.ultraExperience;
    if (snap.trailExperience !== undefined)
      athlete.trailExperience = snap.trailExperience;
    if (
      snap.experienceLevel === "beginner" ||
      snap.experienceLevel === "intermediate" ||
      snap.experienceLevel === "advanced" ||
      snap.experienceLevel === "elite"
    ) {
      athlete.experience = snap.experienceLevel;
    }
  }

  console.log("\n📊 Athlete Profile (enriched from snapshot):");
  console.log(`   Experience: ${athlete.experience}`);
  console.log(`   Weekly mileage: ${athlete.weeklyMileage} mi`);
  console.log(`   Longest run: ${athlete.longestRun} mi`);
  console.log(`   Longest run ever: ${athlete.longestRunEver ?? "N/A"} mi`);
  console.log(`   Lifetime miles: ${athlete.lifetimeMiles ?? "N/A"}`);
  console.log(`   CTL/ATL: ${athlete.ctl ?? "N/A"}/${athlete.atl ?? "N/A"}`);
  console.log(
    `   Threshold pace: ${athlete.thresholdPace ? athlete.thresholdPace.toFixed(2) : "N/A"} min/mi`
  );

  // 4. Build race goal
  const goal: RaceGoal = {
    raceDistance: bg.goals.raceDistance,
    raceDate: bg.goals.raceDate,
    targetTime: bg.goals.targetTime,
    elevation: bg.goals.elevation,
  };

  const input: PlanGenerationInput = { athlete, goal };

  // 5. Run the pipeline
  console.log("\n⏳ Running generation pipeline...\n");
  const pipeline = new PlanGenerationPipeline();
  const result = await pipeline.generate(input);

  result.plan.userId = userId;
  result.plan.startDate = Date.now();
  if (goal.raceDate) result.plan.raceDate = goal.raceDate;

  // 6. Deactivate existing plans and save the new one
  const planRef = db.collection("users").doc(userId).collection("trainingPlans");
  const existingPlans = await planRef.where("isActive", "==", true).get();

  const batch = db.batch();
  existingPlans.docs.forEach((doc) => {
    batch.update(doc.ref, { isActive: false });
  });

  const newPlanRef = planRef.doc();
  batch.set(newPlanRef, {
    ...result.plan,
    id: newPlanRef.id,
    isActive: true,
  });

  await batch.commit();
  console.log(`✅ New plan saved with ID: ${newPlanRef.id}`);

  // 7. Save pipeline logs
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("pipelineLogs")
      .doc(newPlanRef.id)
      .set({
        planId: newPlanRef.id,
        createdAt: Date.now(),
        traces: result.traces,
        evaluation: result.evaluation ?? null,
        review: result.review ?? null,
      });
    console.log("✅ Pipeline logs saved");
  } catch (err) {
    console.warn("Failed to save pipeline log:", err);
  }

  // 8. Print a quick summary
  console.log("\n📅 New Plan Summary:");
  console.log(`   Total weeks: ${result.plan.totalWeeks}`);
  console.log(
    `   Phases: ${result.plan.phases.map((p) => `${p.name} W${p.startWeek}-${p.endWeek}`).join(", ")}`
  );
  if (result.evaluation) {
    console.log(
      `   Scores: structural=${result.evaluation.structural} safety=${result.evaluation.safety} methodology=${result.evaluation.methodology} overall=${result.evaluation.overall}`
    );
  }
  if (result.review) {
    console.log(
      `   Review issues: ${result.review.issues.length} (${result.review.fixesApplied} applied, ${result.review.fixesSkipped} skipped)`
    );
  }

  console.log("\n🎯 Week-by-week mileage:");
  for (const week of result.plan.weeks) {
    const miles = week.days.reduce((sum, day) => {
      return (
        sum +
        day.workouts.reduce((dSum, w) => {
          return (
            dSum +
            w.blocks.reduce((bSum, b) => {
              if (b.unit === "miles" && typeof b.value === "number") {
                return bSum + b.value;
              }
              return bSum;
            }, 0)
          );
        }, 0)
      );
    }, 0);
    console.log(`   W${week.weekNumber} [${week.phase}] — ${miles.toFixed(1)}mi`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Regeneration failed:", err);
    process.exit(1);
  });
