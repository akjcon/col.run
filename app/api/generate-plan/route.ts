import { NextRequest, NextResponse } from "next/server";
import { TrainingBackground } from "@/lib/types";
import { PlanGenerationPipeline } from "@/lib/agents/pipeline";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PlanGenerationInput, AthleteProfile, RaceGoal } from "@/lib/agents/types";

export const maxDuration = 300; // 5 min for Vercel (V2 pipeline takes ~60-120s)

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      trainingBackground,
    }: {
      userId: string;
      trainingBackground: TrainingBackground;
    } = await req.json();

    if (!userId || !trainingBackground) {
      return NextResponse.json(
        { error: "Missing userId or trainingBackground" },
        { status: 400 }
      );
    }

    // Map TrainingBackground → PlanGenerationInput
    const athlete: AthleteProfile = {
      experience: trainingBackground.experience,
      weeklyMileage: trainingBackground.weeklyMileage,
      longestRun: trainingBackground.longestRun,
      marathonPR: trainingBackground.marathonPR,
      currentFitness: trainingBackground.currentFitness,
      background: trainingBackground.background,
      injuries: trainingBackground.injuries,
    };

    const db = getAdminDb();

    // If Strava is connected, wait for sync to complete before reading snapshot
    if (trainingBackground.stravaConnected) {
      const stravaRef = db
        .collection("users")
        .doc(userId)
        .collection("integrations")
        .doc("strava");

      const maxWaitMs = 60_000; // 60s max wait
      const pollIntervalMs = 2_000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const stravaSnap = await stravaRef.get();
        if (!stravaSnap.exists) break;

        const status = stravaSnap.data()?.syncStatus;
        if (status === "complete" || status === "error") break;
        if (status !== "syncing") break; // no status = legacy, skip waiting

        console.log("Waiting for Strava sync to complete...");
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    // Read athlete snapshot for enriched data (Strava fitness + experience)
    try {
      const snapshotDoc = await db
        .collection("users")
        .doc(userId)
        .collection("athleteSnapshot")
        .doc("current")
        .get();

      if (snapshotDoc.exists) {
        const snap = snapshotDoc.data()!;
        if (snap.ctl) athlete.ctl = snap.ctl;
        if (snap.atl) athlete.atl = snap.atl;
        if (snap.currentWeeklyMileage) athlete.weeklyMileage = snap.currentWeeklyMileage;
        if (snap.estimatedThresholdPace) athlete.thresholdPace = snap.estimatedThresholdPace;
        if (snap.lifetimeMiles) athlete.lifetimeMiles = snap.lifetimeMiles;
        if (snap.peakWeeklyMileage) athlete.peakWeeklyMileage = snap.peakWeeklyMileage;
        if (snap.ultraExperience !== undefined) athlete.ultraExperience = snap.ultraExperience;
        if (snap.trailExperience !== undefined) athlete.trailExperience = snap.trailExperience;
      }
    } catch (err) {
      console.warn("Could not read athlete snapshot, proceeding with manual data:", err);
    }

    const goal: RaceGoal = {
      raceDistance: trainingBackground.goals.raceDistance,
      raceDate: trainingBackground.goals.raceDate,
      targetTime: trainingBackground.goals.targetTime,
      elevation: trainingBackground.goals.elevation,
    };

    const input: PlanGenerationInput = { athlete, goal };

    // Generate the training plan using V2 pipeline
    console.log("Generating V2 training plan for user:", userId);
    const pipeline = new PlanGenerationPipeline();
    const result = await pipeline.generate(input);

    // Set userId and startDate
    result.plan.userId = userId;
    result.plan.startDate = Date.now();

    // Save to Firestore via admin SDK
    const planRef = db.collection("users").doc(userId).collection("trainingPlans");

    // Deactivate existing plans
    const existingPlans = await planRef.where("isActive", "==", true).get();
    const batch = db.batch();
    existingPlans.docs.forEach((doc) => {
      batch.update(doc.ref, { isActive: false });
    });

    // Save the new plan
    const newPlanRef = planRef.doc();
    batch.set(newPlanRef, {
      ...result.plan,
      id: newPlanRef.id,
      isActive: true,
    });

    await batch.commit();
    console.log("V2 training plan saved with ID:", newPlanRef.id);

    return NextResponse.json({
      success: true,
      planId: newPlanRef.id,
      evaluation: result.evaluation,
    });
  } catch (error) {
    console.error("Error generating V2 training plan:", error);
    return NextResponse.json(
      {
        error: "Failed to generate training plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
