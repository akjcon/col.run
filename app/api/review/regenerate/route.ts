import { after, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { generatePlan } from "@/lib/agents/pipeline";
import { analyzeFeasibility } from "@/lib/planning/feasibility";
import { getRaceRequirements, adjustForElevation } from "@/lib/planning/race-requirements";
import { evaluatePlan } from "@/lib/plan-evaluation";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
  RaceRequirementsSummary,
  FeasibilitySummary,
} from "@/lib/agents/types";

export const maxDuration = 300;

initializeFirebaseAdmin();

const DISTANCE_MAP: Record<string, number> = {
  "5k": 3.1, "10k": 6.2, half: 13.1, marathon: 26.2,
  "50k": 31, "50mi": 50, "100k": 62, "100mi": 100,
};

/**
 * POST /api/review/regenerate
 * Body: { planId: string }
 * Creates a NEW plan with the same athlete/race inputs as the source plan.
 */
export async function POST(request: Request) {
  try {
    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const db = getFirestore();
    const doc = await db.collection("generatedPlans").doc(planId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const data = doc.data()!;
    const athleteProfile = data.athleteProfile as AthleteProfile;
    const raceGoal = data.raceGoal as RaceGoal;

    if (!athleteProfile || !raceGoal) {
      return NextResponse.json({ error: "Source plan missing athlete or race data" }, { status: 400 });
    }

    // Create placeholder
    const placeholderRef = await db.collection("generatedPlans").add({
      athleteName: data.athleteName,
      athleteProfile: JSON.parse(JSON.stringify(athleteProfile)),
      raceGoal: JSON.parse(JSON.stringify(raceGoal)),
      status: "generating",
      createdAt: Date.now(),
      evaluation: { overall: 0 },
      generationTimeMs: 0,
      regeneratedFrom: planId,
    });

    const newPlanId = placeholderRef.id;

    // Generate in background
    after(async () => {
      try {
        const raceType = raceGoal.raceDistance;
        const weeksUntilRace = raceGoal.raceDate
          ? Math.max(4, Math.floor((raceGoal.raceDate - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
          : 16;

        const feasibilityResult = analyzeFeasibility({
          raceType,
          weeksUntilRace,
          elevationGain: raceGoal.elevation || 0,
          currentFitness: {
            userId: "regen",
            updatedAt: Date.now(),
            weeklyMileage: athleteProfile.weeklyMileage,
            longestRun: athleteProfile.longestRun,
            ctl: athleteProfile.ctl || Math.round(athleteProfile.weeklyMileage * 1.2),
            atl: athleteProfile.atl || Math.round(athleteProfile.weeklyMileage * 1.1),
            tsb: (athleteProfile.ctl || 0) - (athleteProfile.atl || 0),
            weeklyVolume: athleteProfile.weeklyMileage * 10,
            avgPace: (athleteProfile.thresholdPace || 9) * 1.2,
            estimatedThresholdPace: athleteProfile.thresholdPace,
          },
          experience: {
            userId: "regen",
            updatedAt: Date.now(),
            lifetimeMiles: athleteProfile.lifetimeMiles || 2500,
            lifetimeRuns: Math.round((athleteProfile.lifetimeMiles || 2500) / 5),
            lifetimeElevationFeet: (athleteProfile.lifetimeMiles || 2500) * 50,
            accountAgeYears: 3,
            longestRunEver: athleteProfile.longestRunEver || athleteProfile.longestRun,
            peakWeeklyMileage: athleteProfile.peakWeeklyMileage || Math.round(athleteProfile.weeklyMileage * 1.3),
            peakMonthlyMileage: (athleteProfile.peakWeeklyMileage || athleteProfile.weeklyMileage) * 4,
            biggestClimbFeet: (raceGoal.elevation || 1000) / 2,
            experienceLevel: athleteProfile.experience,
            ultraExperience: athleteProfile.ultraExperience || false,
            trailExperience: athleteProfile.trailExperience || false,
            totalShoeMileage: (athleteProfile.lifetimeMiles || 2500) * 0.8,
          },
        });

        let requirements = getRaceRequirements(raceType);
        if (!requirements) throw new Error(`Unknown race type: ${raceType}`);
        if (raceGoal.elevation && raceGoal.elevation > 1000) {
          requirements = adjustForElevation(requirements, raceGoal.elevation);
        }

        const raceRequirements: RaceRequirementsSummary = {
          distanceMiles: DISTANCE_MAP[raceType] || 26.2,
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
          athlete: athleteProfile,
          goal: raceGoal,
          constraints: { preferredLongRunDay: "Saturday" },
          raceRequirements,
          feasibility,
        };

        const startTime = Date.now();
        const output = await generatePlan(input);
        const generationTimeMs = Date.now() - startTime;

        const evaluation = evaluatePlan(
          { id: "temp", userId: "temp", totalWeeks: output.plan.totalWeeks, weeks: output.plan.weeks },
          raceType
        );

        const cleanData = JSON.parse(JSON.stringify({
          athleteProfile,
          raceGoal,
          feasibility,
          plan: {
            id: newPlanId,
            userId: "review",
            totalWeeks: output.plan.totalWeeks,
            weeks: output.plan.weeks,
            phases: output.plan.phases,
          },
          evaluation,
          review: output.review ?? null,
          generationTimeMs,
          status: "complete",
        }));

        await db.collection("generatedPlans").doc(newPlanId).update(cleanData);
        console.log(`[Review Regenerate] Complete: ${newPlanId} (${(generationTimeMs / 1000).toFixed(1)}s)`);
      } catch (err) {
        console.error(`[Review Regenerate] Failed:`, err);
        await db.collection("generatedPlans").doc(newPlanId).update({
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });

    return NextResponse.json({ success: true, planId: newPlanId });
  } catch (error) {
    console.error("[Review Regenerate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate" },
      { status: 500 }
    );
  }
}
