import { NextRequest, NextResponse } from "next/server";
import { TrainingBackground } from "@/lib/types";
import { PlanGenerationPipeline } from "@/lib/agents/pipeline";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PlanGenerationInput, AthleteProfile, RaceGoal } from "@/lib/agents/types";

export const maxDuration = 300; // 5 min for Vercel (V2 pipeline takes ~60-120s)

// =============================================================================
// Progress event types streamed back as NDJSON
// =============================================================================

type ProgressStep = "syncing" | "analyzing" | "generating" | "reviewing" | "saving";

interface ProgressEvent {
  type: "progress";
  step: ProgressStep;
  message: string;
}

interface CompleteEvent {
  type: "complete";
  planId: string;
  evaluation: unknown;
  review: unknown;
}

interface ErrorEvent {
  type: "error";
  message: string;
}

type StreamEvent = ProgressEvent | CompleteEvent | ErrorEvent;

const STEP_MESSAGES: Record<ProgressStep, string> = {
  syncing: "Syncing your recent runs from Strava...",
  analyzing: "Reading your fitness profile...",
  generating: "Building your training plan...",
  reviewing: "Reviewing for safety and balance...",
  saving: "Saving your plan...",
};

export async function POST(req: NextRequest) {
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const sendProgress = (step: ProgressStep) => {
        send({ type: "progress", step, message: STEP_MESSAGES[step] });
      };

      try {
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

        // Step 1: If Strava is connected, wait for sync to complete
        if (trainingBackground.stravaConnected) {
          sendProgress("syncing");

          const stravaRef = db
            .collection("users")
            .doc(userId)
            .collection("integrations")
            .doc("strava");

          const maxWaitMs = 60_000;
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

        // Step 2: Read athlete snapshot for enriched data
        sendProgress("analyzing");
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

        // Step 3: Run the generation pipeline (generating → reviewing)
        console.log("Generating V2 training plan for user:", userId);
        const pipeline = new PlanGenerationPipeline();
        const result = await pipeline.generate(input, {
          onProgress: (step) => {
            // Map pipeline steps to user-facing progress events
            if (step === "generating") sendProgress("generating");
            else if (step === "reviewing") sendProgress("reviewing");
          },
        });

        // Step 4: Persist the plan
        sendProgress("saving");

        result.plan.userId = userId;
        result.plan.startDate = Date.now();
        if (goal.raceDate) result.plan.raceDate = goal.raceDate;
        if (goal.raceName) result.plan.raceName = goal.raceName;

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

        // Save pipeline log for debugging — non-fatal if it fails
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
        } catch (logErr) {
          console.warn("Failed to save pipeline log:", logErr);
        }

        send({
          type: "complete",
          planId: newPlanRef.id,
          evaluation: result.evaluation,
          review: result.review ?? null,
        });
        controller.close();
      } catch (error) {
        console.error("Error generating V2 training plan:", error);
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to generate training plan",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
